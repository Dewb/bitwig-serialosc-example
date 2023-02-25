// example of a possible approach to using the Bitwig API's OSC module
// to connect to a serialosc device
//
// currently does not work -- bitwig requires that all connections be made from init()
// see comments in connectToDevice()

loadAPI(7);

host.setShouldFailOnDeprecatedUse(true);

host.defineController("monome", "serialosc", "1.0", "2213d685-3d30-4de0-b3c4-b86daff826ed", "dewb");

var oscModule = null;
var serialOscConnection = null;

var serialOscPort = 12002;
var listenerPort = 19991;
var hostname = "127.0.0.1";
var prefix = "/bitwig";

var devices = {}

var initComplete = false;

function init()
{
    oscModule = host.getOscModule();

    serialOscConnection = oscModule.connectToUdpServer(hostname, serialOscPort, oscModule.createAddressSpace());

    var listenerAddressSpace = oscModule.createAddressSpace();
    listenerAddressSpace.setShouldLogMessages(true);
    listenerAddressSpace.registerMethod("/serialosc/device", ",ssi", "device info", handleDeviceInfo);
    listenerAddressSpace.registerMethod("/serialosc/add", ",ssi", "device added", handleDeviceAdded);
    listenerAddressSpace.registerMethod("/serialosc/remove", ",ssi", "device removed", handleDeviceRemoved);

    // this will support one arc and/or one grid. 
    // if you want to support multiple devices of the same type, you'll need fancier prefix management.
    registerArcMethods(prefix, listenerAddressSpace);
    registerGridMethods(prefix, listenerAddressSpace);

    oscModule.createUdpServer(listenerPort, listenerAddressSpace);

    queryDevices();
}

function queryDevices()
{
    serialOscConnection.sendMessage("/serialosc/list", hostname, listenerPort);
    serialOscConnection.sendMessage("/serialosc/notify", hostname, listenerPort);
}

function printDevices()
{
    println("Serialosc devices: " + JSON.stringify(devices));
}

function handleDeviceInfo(source, message)
{
    var args = message.getArguments();
    var id = args[0];
    var type = args[1];
    var port = args[2];
    if (!(id in devices)) {
        devices[id] = { id, type, port, connection: null };

        printDevices();
        connectToDevice(id);
    }
}

function handleDeviceAdded(source, message)
{
    var args = message.getArguments();
    var id = args[0];
    var type = args[1];
    var port = args[2];
    devices[id] = { id, type, port, connection: null };

    printDevices();
    connectToDevice(id);

    serialOscConnection.sendMessage("/serialosc/notify", hostname, listenerPort);
}

function handleDeviceRemoved(source, message)
{
    var args = message.getArguments();
    var id = args[0];
    
    delete devices[id];
    println("removed device " + id);
    printDevices();

    serialOscConnection.sendMessage("/serialosc/notify", hostname, listenerPort);
}

function registerArcMethods(prefix, addressSpace)
{
    addressSpace.registerMethod(prefix + "/enc/delta", ",ii", "encoder position change", function(source, message) {
        var args = message.getArguments();
        var encoder = args[0];
        var delta = args[1];
        println("encoder " + encoder + " delta: " + delta);
    });

    addressSpace.registerMethod(prefix + "/enc/key", ",ii", "encoder key state change", function(source, message) {
        var args = message.getArguments();
        var encoder = args[0];
        var state = args[1];
        println("encoder " + encoder + " state: " + state);
    });
}

function registerGridMethods(prefix, addressSpace)
{
    addressSpace.registerMethod(prefix + "/grid/key", ",iii", "grid key state change", function(source, message) {
        var args = message.getArguments();
        var x = args[0];
        var y = args[1];
        var s = args[2];
        println("key (" + x + "," + y + ") " + s ? "down" : "up");
    });

    addressSpace.registerMethod(prefix + "/tilt", ",iiii", "tilt sensor position change", function(source, message) {
        var args = message.getArguments();
        var sensor = args[0];
        var x = args[1];
        var y = args[1];
        var z = args[1];
        println("tilt " + sensor + " (" + x + "," + y + "," + z + ")");
    });
}

function connectToDevice(id)
{
    println("Connecting to device " + id + " on port " + devices[id].port);

    // calls below to connectToUdpServer and createAddressSpace will fail with 
    // the message "This can only be called during driver initialization"
    // unfortunately, we cannot create the connection during init(), since
    // we don't know the port until we get a device connection message
    
    // devices[id].connection = oscModule.connectToUdpServer(hostname, devices[id].port, oscModule.createAddressSpace());
    // devices[id].connection.sendMessage("/sys/host", hostname);
    // devices[id].connection.sendMessage("/sys/port", listenerPort);
    // devices[id].connection.sendMessage("/sys/prefix", prefix);
}

function exit()
{

}