// Example of an approach to using Bitwig's Javascript Controller API
// to connect to a serialosc device (grid or arc.)

loadAPI(16);

host.defineController("monome", "serialosc", "1.0", "2213d685-3d30-4de0-b3c4-b86daff826ed", "dewb");

var serialOscConnection = null;
var deviceConnection = null;
var listenerConnection = null;
var portSetting = null;

var serialOscPort = 12002;
var listenerPort = 19996;
var devicePort = 0;

var hostname = "127.0.0.1";
var prefix = "/bitwig";

// Variables to hold arc/grid LED state
var encs = [0, 0, 0, 0];
var keys = [...Array(16)].map(_ => Array(16).fill(0));

function init() {

    var oscModule = host.getOscModule();
    var preferences = host.getPreferences();

    // Create a preference for the UDP port for the device we want to connect to.
    portSetting = preferences.getStringSetting("Device Port", "Connection", 5, "15000");
    portSetting.addValueObserver(function(newValue) {
        var v = parseInt(newValue);
        if (isNaN(v) || (v != 0 && v < 1024) || v > 65535) {
            // Ignore string that are not valid OSC ports, or 0 for "no device"
            portSetting.set(devicePort.toString());
        }
        else if (parseInt(newValue) != devicePort) {
            // Bitwig requires that all OSC connections are set up during init(),
            // so we need to restart the extension whenever the port changes.
            host.restart();
        }
    });

    // Create a pushbutton that will request a list of connected devices from serialosc and autofill the correct port.
    var detect = preferences.getSignalSetting("Detect", "Connection", "Detect Device Port");
    detect.addSignalObserver(function() {
        portSetting.set("0");
        if (serialOscConnection) {
            serialOscConnection.sendMessage("/serialosc/list", hostname, listenerPort);
        }
    });

    // Create our OSC listener to respond to serialosc global and device messages
    var listenerAddressSpace = oscModule.createAddressSpace();
    listenerAddressSpace.setShouldLogMessages(true);

    // This will support one arc or one grid. If you want to support multiple devices,
    // you'll need fancier prefix and connection management.
    registerGlobalMethods(listenerAddressSpace);
    registerArcMethods(prefix, listenerAddressSpace);
    registerGridMethods(prefix, listenerAddressSpace);

    // Create our UDP/OSC connections: outgoing to serialosc and device, incoming to listener.
    try {
        serialOscConnection = oscModule.connectToUdpServer(hostname, serialOscPort, null);
    } catch(e) {
        println("Got exception connecting to serialosc port " + serialOscPort + ": " + e.message);
    }

    try {
        listenerConnection = oscModule.createUdpServer(listenerPort, listenerAddressSpace);
    } catch(e) {
        println("Got exception creating listener port " + listenerPort + ": " + e.message);
    }

    try {
        devicePort = parseInt(portSetting.get());
        if (devicePort != 0) {
            deviceConnection = connectToDevice(devicePort);
        }
    } catch(e) {
        println("Got exception connecting to device port " + devicePort + ": " + e.message);
    }

}

function clamp(a, min, max) {
    return Math.min(Math.max(a, min), max);
};

function onConnection(device) {
    if (device) {
        // for grids, clear the LEDs and enable the tilt sensor (if present)
        device.sendMessage(prefix + "/grid/led/level/all", 0);
        device.sendMessage(prefix + "/tilt/set", 0, 1);

        // for arcs, clear all LEDs except the first
        for (var i = 0; i < 4; i++) {
            device.sendMessage(prefix + "/ring/all", i, 0);
            device.sendMessage(prefix + "/ring/set", i, 0, 15);
        }
    }
}

function onEncoderDelta(encoder, delta) {
    // Example of responding to an event with LED feedback: draw a bar graph on the ring.
    encs[encoder] = clamp(encs[encoder] + delta/8, 0, 63);
    println(JSON.stringify(encs));

    var breakpoint = Math.floor(encs[encoder]);
    if (deviceConnection) {
        deviceConnection.sendMessage(prefix + "/ring/range", encoder, 0, breakpoint, 15);
        if (breakpoint < 63) {
            deviceConnection.sendMessage(prefix + "/ring/range", encoder, breakpoint + 1, 63, 0);
        }
    }
}

function onEncoderKey(encoder, state) {
}

function onGridKey(x, y, s) {
    // Example of responding to an event with LED feedback: toggle LED on keypress.
    if (deviceConnection) {
        if (s == 1) {
            keys[x][y] = keys[x][y] ? 0 : 1;
            deviceConnection.sendMessage(prefix + "/grid/led/level/set", x, y, 15);
        } else {
            deviceConnection.sendMessage(prefix + "/grid/led/level/set", x, y, keys[x][y] ? 6 : 0);
        }
    }
}

function onTilt(sensor, x, y, z) {
}

function onDeviceInfo(id, type, port) {
    if (port != devicePort) {
        if (portSetting) {
            portSetting.set(port.toString());
        }

        // Bitwig requires that all OSC connections are set up during init(),
        // so we need to restart the extension whenever the port changes.
        host.restart();
    }
}

function connectToDevice(port) {
    if (isNaN(port) || port < 1024 || port > 65535) {
        println("Invalid port " + port);
        return;
    }

    println("Connecting to device on port " + port);

    var device = host.getOscModule().connectToUdpServer(hostname, port, host.getOscModule().createAddressSpace());
    if (device) {
        device.sendMessage("/sys/host", hostname);
        device.sendMessage("/sys/port", listenerPort);
        device.sendMessage("/sys/prefix", prefix);

        onConnection(device);
    }

    return device;
}

function registerGlobalMethods(addressSpace) {

    addressSpace.registerMethod("/serialosc/device", ",ssi", "device info", function (source, message) {
        var args = message.getArguments();
        var id = args[0];
        var type = args[1];
        var port = args[2];
        println("device detected: " + id + " type: " + type + " port: " + port);

        onDeviceInfo(id, type, port);
    });
}

function registerArcMethods(prefix, addressSpace) {

    addressSpace.registerMethod(prefix + "/enc/delta", ",ii", "encoder position change", function(source, message) {
        var args = message.getArguments();
        var encoder = args[0];
        var delta = args[1];
        println("encoder " + encoder + " delta: " + delta);

        onEncoderDelta(encoder, delta);
    });

    addressSpace.registerMethod(prefix + "/enc/key", ",ii", "encoder key state change", function(source, message) {
        var args = message.getArguments();
        var encoder = args[0];
        var state = args[1];
        println("encoder " + encoder + " state: " + state);

        onEncoderKey(encoder, state);
    });
}

function registerGridMethods(prefix, addressSpace) {

    addressSpace.registerMethod(prefix + "/grid/key", ",iii", "grid key state change", function(source, message) {
        var args = message.getArguments();
        var x = args[0];
        var y = args[1];
        var s = args[2];
        println("key (" + x + "," + y + ") " + (s ? "down" : "up"));

        onGridKey(x, y, s);
    });

    addressSpace.registerMethod(prefix + "/tilt", ",iiii", "tilt sensor position change", function(source, message) {
        var args = message.getArguments();
        var sensor = args[0];
        var x = args[1];
        var y = args[2];
        var z = args[3];
        println("tilt " + sensor + " (" + x + "," + y + "," + z + ")");

        onTilt(sensor, x, y, z);
    });
}
