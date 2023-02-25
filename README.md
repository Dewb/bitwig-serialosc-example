## bitwig-serialosc-example

Example of connecting to a [serialosc](https://monome.org/docs/serialosc/osc/) device using the Bitwig Javascript Controller API.

### Usage

1. Put the contents of this repository into Bitwig's `Bitwig Studio/Controller Scripts` folder.
2. In the Bitwig dashboard, click **Settings > Controllers**.
3. Click **Add Controller** and select **monome** as **Hardware Vendor** and **serialosc** as **Product**. Click **Add**.
4. In the controller entry that appears, click the gear icon to expose controls.
5. Click **Detect Device** and, if a serialosc device is connected, the **Device Port** should update with your device port.
6. Click the power button on the controller entry to disable it, and then click it a second time to restart.

### Notes

Restarting the extension is necessary because Bitwig requires extensions to set up their OSC connections during initialization,
but serialosc expects clients to request a list of connected devices to discover OSC port assignments at runtime. Turning it
off and back on allows the extension to connect to the port detected in the previous session.

Typescript dependencies are just to get API syntax completion in VS Code; no compilation step is necessary.