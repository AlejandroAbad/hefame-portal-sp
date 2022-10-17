console.log('Inicializando servicio RRHH-APP NODE', new Date());

require('./bootstrap')().then(async () => {


	const cluster = require('cluster');
	const C = global.configuracion;

	// Lanzamiento de los workers
	if (C.numeroWorkers > 0) {
		console.log(`Lanzando ${C.numeroWorkers} procesos worker`);
		cluster.setupMaster({ exec: 'worker.js' });
		for (let i = 0; i < C.numeroWorkers; i++) {
			cluster.fork();
		}
	} else {
		console.log(`No se lanza ningún proceso worker porque así se indica en la configuración`);
	}

	cluster.on('exit', (workerMuerto, code, signal) => {
		console.log(`Un worker ha muerto.`, { id: workerMuerto.id, code, signal });
	});
});