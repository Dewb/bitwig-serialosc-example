## bitwig-serialosc-example

Example of connecting to a [serialosc](https://monome.org/docs/serialosc/osc/) device using the Bitwig Javascript Controller API.

### Usage

1. Put the contents of this repository into Bitwig's `Bitwig Studio/Controller Scripts` folder.
2. In the Bitwig dashboard, click **Settings > Controllers**.
3. Click **Add Controller** and select **monome** as **Hardware Vendor** and **serialosc** as **Product**. Click **Add**.
4. In the controller entry that appears, click the gear icon to expose controls.
5. Click **Detect Device** and, if a serialosc device is connected, the **Device Port** should update with your device port.
6. Turn an encoder (for arc) or press keys (for grid) and you should see LED feedback.

### Notes

Bitwig requires extensions to set up their OSC connections during initialization, so the extension has to restart
itself when the port is changed or a device is detected.

Typescript dependencies are just to get API syntax completion in VS Code; no compilation step is necessary.