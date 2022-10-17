const saml2 = require('saml2-js');
const fs = require('fs');
const C = global.configuracion;

module.exports = function rutasSaml2(app) {

	const samlSP = new saml2.ServiceProvider({
		entity_id: `${C.sso.sp.urlBase}${C.sso.sp.rutaBase}${C.sso.sp.endpoints.metadata}`,
		private_key: fs.readFileSync(C.sso.sp.rsa.privada).toString(),
		certificate: fs.readFileSync(C.sso.sp.rsa.publica).toString(),
		assert_endpoint: `${C.sso.sp.urlBase}${C.sso.sp.rutaBase}${C.sso.sp.endpoints.assert}`
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
			res.sendStatus(400).json({
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
		let options = { request_body: req.body };
		console.log(options)
		samlSP.post_assert(samlIDP, options, function (err, saml_response) {
			if (err != null) {
				console.log(err);
				return res.sendStatus(500);
			}

			// Save name_id and session_index for logout
			// Note:  In practice these should be saved in the user session, not globally.
			console.log('saml_response', saml_response);
			//name_id = saml_response.user.name_id;
			//session_index = saml_response.user.session_index;

			let callback = req.cookie('hul_caller');

			res.send("Hello #{saml_response.user.name_id}!");
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
				return res.send(500);
			res.redirect(logout_url);
		});
	});


}