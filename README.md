## bitwig-serialosc-example

An attempt to connect to a [serialosc](https://monome.org/docs/serialosc/osc/) device using the Bitwig Javascript Controller API.

Currently does not work because Bitwig requires all UDP/OSC connections to be made in `init()`, while serialosc expects device ports
to be dynamically assigned and queried by clients.

Typescript dependencies are just to get API syntax completion in VS Code; no compilation step is necessary.