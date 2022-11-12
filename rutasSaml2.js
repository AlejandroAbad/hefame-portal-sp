const saml2 = require('saml2-js');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const C = global.configuracion;

module.exports = function rutasSaml2(app) {

	const samlSP = new saml2.ServiceProvider({
		entity_id: `${C.sso.sp.urlBase}${C.sso.sp.rutaBase}${C.sso.sp.endpoints.metadata}`,
		private_key: fs.readFileSync(C.sso.sp.rsa.privada).toString(),
		certificate: fs.readFileSync(C.sso.sp.rsa.publica).toString(),
		assert_endpoint: `${C.sso.sp.urlBase}${C.sso.sp.rutaBase}${C.sso.sp.endpoints.assert}`,
		allow_unencrypted_assertion: true
	});

	const samlIDP = new saml2.IdentityProvider({
		sso_login_url: C.sso.idp.login,
		sso_logout_url: C.sso.idp.logout,
		certificates: C.sso.idp.certificados.map(certificado => fs.readFileSync(certificado).toString())
	});


	// Endpoint to retrieve metadata
	app.get(C.sso.sp.endpoints.metadata, function (req, res) {
		res.type('application/xml');
		res.send(samlSP.create_metadata());
	});


	// Starting point for login
	app.get(C.sso.sp.endpoints.login, function (req, res) {

		let callbackUrl = req.query.callback;

		if (!callbackUrl) {
			res.status(400).json({
				errores: [
					{
						"codigo": "SAML:NO_CALLBACK_URL",
						"descripcion": "No se ha especificado la URL de callback",
						"timestamp": new Date(),
					}
				]
			})
			return;
		}

		res.cookie('hul_caller', callbackUrl);
		samlSP.create_login_request_url(samlIDP, {}, function (err, login_url, request_id) {
			if (err != null)
				return res.sendStatus(500);
			res.redirect(login_url);
		});
	});


	// Assert endpoint for when login completes
	app.post(C.sso.sp.endpoints.assert, function (req, res) {
		let hul_caller = Buffer.from(req.cookies.hul_caller, 'base64').toString('utf-8');
		res.cookie('hul_caller', '');

		let options = {request_body: req.body};	
		samlSP.post_assert(samlIDP, options, function (err, saml_response) {
			if (err != null) {
				console.log(err);
				return res.sendStatus(500);
			}

			let payload = {
				cliente: saml_response.user.name_id,
				sess_idx: saml_response.user.session_index,
				salesforce: {
					user_id: saml_response.user.attributes.userId[0],
					username: saml_response.user.attributes.username[0],
					email: saml_response.user.attributes.email[0],
					is_portal_user: saml_response.user.attributes.is_portal_user[0]
				},
				exp: Math.floor((new Date()).getTime()/1000) + 3600
			}

			res.redirect(hul_caller + '?token=' + jwt.sign(payload, 'Si?oQue?') );
//			res.json(saml_response.user);
		});
	});

	// Starting point for logout
	app.get(C.sso.sp.endpoints.logout, function (req, res) {
		var options = {
			name_id: req.query.uid,
			session_index: req.query.sessid
		};

		samlSP.create_logout_request_url(samlIDP, options, function (err, logout_url) {
			if (err != null)
				return res.sendStatus(500);
			res.redirect(logout_url);
		});
	});


}
