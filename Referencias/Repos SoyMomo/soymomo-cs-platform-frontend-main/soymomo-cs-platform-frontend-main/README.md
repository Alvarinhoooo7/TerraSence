# Soy Momo Customer Service Platform Frontend

## Manual de Uso

### Funciones

- Commandos TCP
- Display de información para:
  - Watch
  - Tablet
  - Tarjeta Sim (suscripción y plan incluidos)
- Cancelación de suscripción
- Pausar una suscripción
- Reanudar una suscripción
- Apagar un reloj
- Resetear un reloj (a valores de fábrica)

### Buscador de Sim

Se puede buscar por:

- Datos suscriptor:
  - Nombre
  - Apellido
  - N° Teléfono
  - Rut
- iccId
- msisdn (N° teléfono de sim)

### Buscador de relojes

Se puede buscar por:

- deviceId
- imei
- objectId (Identificador base de datos)
- N° telefono

## Developer Docs

### Instalación y ejecución

```npm i && npm start```

### Deploy

Existe un pipeline automático que sube los cambios a un ambiente de development en AWS S3 y a github pages en producción.  
Para el funcionamiento del pipeline y del servidor de producción no se deben modificar las ramas `gh-deploy` ni `pre_deploy`. El deploy queda alojado en la rama `gh-deploy` luego de ser compilado por webpack. La rama `pre_deploy` es un bypass para poder tener un pipeline desde una rama a otra sin tener infinitas actions recursivas.  
Cada vez que se hace un push a development se activa el pipeline de development y lo mismo para main (producción).  
Cuando se acutalice main (**Producción**) se debe volver a ingresar el nombre de dominio en la configuración del repo (en el apartado github pages).  
El dominio de producción es [customerservice.soymomo.io](https://customerservice.soymomo.io)  
El dominio de development es [customerservice-dev.soymomo.io](https://customerservice-dev.soymomo.io)
