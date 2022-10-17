

module.exports = async function(tipoProceso) {

	global.configuracion = require(process.env.RRHH_APP_NODE_CONFIG || './config.json')

	if (!tipoProceso)
		console.log(global.configuracion);

	process.on('uncaughtException', async (excepcionNoControlada) => {
		console.log('process.on(uncaughtException)')
		console.log(excepcionNoControlada);
		process.exit(1);
	})
	process.on('exit', (code) => {
		process.exit(code);
	});
}


