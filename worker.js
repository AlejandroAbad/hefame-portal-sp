console.log('Inicializando Worker RRHH APP', new Date());

require('./bootstrap')('worker').then(() => {

	const C = global.configuracion;

	const app = require('express')();
	app.use(require('cookie-parser')());
	app.use(require('cors')());
	app.disable('x-powered-by');
	app.disable('etag');
	app.use(require('body-parser').json({ extended: true, limit: '1mb' }));

	// Carga de rutas
	const rutasSaml2 = require('./rutasSaml2');
	rutasSaml2(app);

	const servidorHttp = app.listen(C.puertoHttp)

	servidorHttp.on('error', (errorServidorHTTP) => {
		console.log('Ocurrió un error en el servicio HTTP:', errorServidorHTTP);
		process.exit(1);
	});
	servidorHttp.on('listening', () => {
		console.log(`Servidor HTTP a la escucha en el puerto ${C.puertoHttp}`);
	});
	servidorHttp.on('close', () => { console.log("Se ha cerrado el servicio HTTP"); });
});