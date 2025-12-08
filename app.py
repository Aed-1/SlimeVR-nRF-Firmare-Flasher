from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import logging
import os
import subprocess

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

root_path = os.path.dirname(__file__)
def iterate(reset):
    lines4 = open("Iterations/Iterations.txt", "r").readlines()
    iteration = int(lines4[0]) + 1
    write4 = open("Iterations/Iterations.txt", "w")
    if reset == True:
        write4.write(0)
    else:
        write4.write(str(iteration))
    write4.close()
    return iteration

global prebuiltURLs
prebuiltURLs = []

def build(mcu, imu, hex, clk, sw0, vccGpio, lp, sleep):
    global iteration
    iteration = iterate(False)


    root_path = os.path.dirname(__file__)

    subprocess.run(f"cd {root_path}/firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0 && git clone --single-branch --recurse-submodules -b main https://github.com/SlimeVR/SlimeVR-Tracker-nRF.git SlimeVR-Tracker-nRF-{iteration}", shell=True)

    dtsPathProMicro = os.path.join(root_path, f"firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0/SlimeVR-Tracker-nRF-{iteration}/boards/nordic/promicro_uf2/promicro_uf2.dts")
    dtsPathXiao = os.path.join(root_path, f"firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0/SlimeVR-Tracker-nRF-{iteration}/boards/xiao_ble.overlay")
    dtsPathXiaoSense = os.path.join(root_path, f"firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0/SlimeVR-Tracker-nRF-{iteration}/boards/xiao_ble_nrf52840_sense.overlay")
    dtsPathChrysalis = os.path.join(root_path, f"firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0/SlimeVR-Tracker-nRF-{iteration}/boards/nordic/promicro_uf2/promicro_uf2_chrysalis.dts")
    confPathXiao = os.path.join(root_path, f"firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0/SlimeVR-Tracker-nRF-{iteration}/boards/xiao_ble.conf")
    confPathXiaoSense = os.path.join(root_path, f"firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0/SlimeVR-Tracker-nRF-{iteration}/boards/xiao_ble_nrf52840_sense.conf")
    confPathButterfly = os.path.join(root_path, f"firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0/SlimeVR-Tracker-nRF-{iteration}/boards/slimevr/slimevrmini_p4r9_uf2/slimevrmini_p4r9_uf2_defconfig")
    confPathChrysalis = os.path.join(root_path, f"firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0/SlimeVR-Tracker-nRF-{iteration}/boards/nordic/promicro_uf2/promicro_uf2_chrysalis_defconfig")
    kconfigPath = os.path.join(root_path, f"firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0/SlimeVR-Tracker-nRF-{iteration}/prj.conf")

    sw0Enabled = True
    senseClk = True
    clkEnabled = True
    ledR = 0
    ledG = 0
    ledB = 0
    global gpiovcc
    gpiovcc = 0

    # PARAMS
    sleepEnabled = bool(sleep) #default False
    clkPin = clk #default pin 20
    sw0Pin = sw0 #default pin 1.00
    board = mcu #default promicro_spi
    #imu default ICM-45686
    #default pin 0.31
    lpTimeout = lp #default 5 minutes
    hexColor = hex



    if hexColor != "":
        customColor = True
        ledRGBColor = tuple(int(hexColor.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
        ledR = round(pow((ledRGBColor[0] / 255),2.2) * 10000)
        ledG = round(pow((ledRGBColor[1] / 255),2.2) * 10000)
        ledB = round(pow((ledRGBColor[2] / 255),2.2) * 10000)
    else:
        customColor = False

    if sleepEnabled == True:
        sleep = "y"
    else:
        sleep = "n"
        
    if imu != "ICM-45686":
        clkPinAc = "0"
    else:
        clkPinAc = clkPin
        senseClk = False

    if len(clkPinAc) == 3:
        if clkPinAc[0] == "0":
            gpioclk = 0
        elif clkPinAc[0] == "1":
            gpioclk = 1
        else:
            print("invalid clk pin, use correct format 'xxx' e.g. 022 or 104 (pin 0.20 and 1.04)")
    elif clkPinAc == "0" or clkPin == "0":
        clkEnabled = False
    else:
        print("invalid clk pin, use correct format 'xxx' e.g. 031 or 104 (pin 0.20 and 1.04)")

    if len(sw0Pin) == 3:
        if sw0Pin[0] == "0":
            gpio = 0
        elif sw0Pin[0] == "1":
            gpio = 1
        else:
            print("invalid sw0 pin, use correct format 'xxx' e.g. 011 or 100")
    elif sw0Pin == "0":
        sw0Enabled = False
    else:
        print("invalid sw0 pin, use correct format 'xxx' e.g. 011 or 100")
    if len(vccGpio) == 3:
        if vccGpio[0] == "0":
            gpiovcc = 0
        elif vccGpio[0] == "1":
            gpiovcc = 1
        else:
            print("invalid vcc-gpio pin, use correct format 'xxx' e.g. 031 or 106 (pin 0.31 and 1.06)")
    elif vccGpio == "0":
        pass
    else:
        print("invalid vcc-gpio pin, use correct format 'xxx' e.g. 031 or 106 (pin 0.31 and 1.06)")




    def PromicroDefines(): 
        if sw0Enabled:
            if sw0Pin != vccGpio:
                lines = open(dtsPathProMicro, 'r').readlines()
                lines[90] = f"			gpios = <&gpio{gpio} {int(sw0Pin[-2:])} (GPIO_PULL_UP | GPIO_ACTIVE_LOW)>;" + "\n"
                with open(dtsPathProMicro, "w") as f:
                    f.writelines(lines)
                    f.close()

                lines = open(dtsPathProMicro, 'r').readlines()
                lines[118] = f"		vcc-gpios = <&gpio{gpiovcc} {int(vccGpio[-2:])} GPIO_ACTIVE_HIGH>;" + "\n"
                with open(dtsPathProMicro, "w") as f:
                    f.writelines(lines)
                    f.close()
            else:
                print("sw0 and VCC-GPIO defines can not be the same")

            lines = open(dtsPathProMicro, 'r').readlines()
            lines[96] = "	    sw0 = &button0; // Uncomment to Enable SW0" + "\n"
            with open(dtsPathProMicro, "w") as f:
                    f.writelines(lines)
                    f.close()
        else:
            pass

        if clkEnabled == True:
            lines = open(dtsPathProMicro, 'r').readlines()
            lines[117] = f"		clk-gpios = <&gpio{gpioclk} {int(clkPinAc[-2:])} GPIO_OPEN_DRAIN>; // Uncomment and set to correct pin if using an external clock (crystal oscillator)" + "\n"
            with open(dtsPathProMicro, "w") as f:
                    f.writelines(lines)
                    f.close()
        else:
            pass

    def XiaoDefines(): 
        if sw0Enabled:
            if sw0Pin != vccGpio:
                lines = open(dtsPathXiao, 'r').readlines()
                lines[46] = f"			gpios = <&gpio{gpio} {int(sw0Pin[-2:])} (GPIO_PULL_UP | GPIO_ACTIVE_LOW)>;" + "\n"
                with open(dtsPathXiao, "w") as f:
                    f.writelines(lines)
                    f.close()
            else:
                print("sw0 and VCC-GPIO defines can not be the same")

            lines = open(dtsPathXiao, 'r').readlines()
            lines[52] = "       sw0 = &button0; // Uncomment to Enable SW0" + "\n"
            with open(dtsPathXiao, "w") as f:
                    f.writelines(lines)
                    f.close()
        else:
            pass

        if clkEnabled == True:
            lines = open(dtsPathXiao, 'r').readlines()
            lines[69] = f"		clk-gpios = <&gpio{gpioclk} {int(clkPinAc[-2:])} GPIO_OPEN_DRAIN>; // Uncomment and set to correct pin if using an external clock (crystal oscillator)" + "\n"
            with open(dtsPathXiao, "w") as f:
                    f.writelines(lines)
                    f.close()
        else:
            pass

        with open(confPathXiao, "a") as f:
            if customColor:
                f.write("\n" + "CONFIG_LED_TRI_COLOR=n" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_R={ledR}" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_G={ledG}" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_B={ledB}" + "\n")
                f.close()


    def XiaoSenseDefines():
        if sw0Enabled:
            if sw0Pin != vccGpio:
                lines = open(dtsPathXiaoSense, 'r').readlines()
                lines[50] = f"			gpios = <&gpio{gpio} {int(sw0Pin[-2:])} (GPIO_PULL_UP | GPIO_ACTIVE_LOW)>;" + "\n"
                with open(dtsPathXiaoSense, "w") as f:
                    f.writelines(lines)
                    f.close()
            else:
                print("sw0 and VCC-GPIO defines can not be the same")

            lines = open(dtsPathXiaoSense, 'r').readlines()
            lines[56] = "	    sw0 = &button0; // Uncomment to Enable SW0" + "\n"
            with open(dtsPathXiaoSense, "w") as f:
                    f.writelines(lines)
                    f.close()
        else:
            pass

        with open(confPathXiaoSense, "a") as f:
            if customColor:
                f.write("\n" + "CONFIG_LED_TRI_COLOR=n" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_R={ledR}" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_G={ledG}" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_B={ledB}" + "\n")
                f.close()

    def ButterflyDefines():
        if customColor:
            with open(confPathButterfly, "a") as f:
                f.write("\n" + "CONFIG_LED_TRI_COLOR=n" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_R={ledR}" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_G={ledG}" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_B={ledB}" + "\n")
                f.close()

    def ChrysalisDefines():
        if clkEnabled == True:
            lines = open(dtsPathChrysalis, 'r').readlines()
            lines[63] = f"     clk-gpios = <&gpio{gpiovcc} {int(vccGpio[-2:])} GPIO_OPEN_DRAIN>;" + "\n"
            with open(dtsPathChrysalis, "w") as f:
                    f.writelines(lines)
                    f.close()
        else:
            pass

        if customColor:
            with open(confPathChrysalis, "a") as f:
                f.write("\n" + "CONFIG_LED_TRI_COLOR=n" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_R={ledR}" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_G={ledG}" + "\n")
                f.write(f"CONFIG_LED_DEFAULT_COLOR_B={ledB}" + "\n")
                f.close()



    with open(kconfigPath, "a") as f:
        f.write("\n" + f"CONFIG_USE_IMU_WAKE_UP={sleep}" + "\n")
        if lpTimeout != 0:
            f.write(f"CONFIG_SENSOR_LP_TIMEOUT={int(lpTimeout)*1000}" + "\n")
        else:
            pass
        if senseClk == False:
            f.write("CONFIG_USE_SENSOR_CLOCK=n" + "\n")
        else:
            pass
        f.close()


    if board == "ProMicro-SPI":
        boardBuild = "promicro_uf2/nrf52840/spi"
        PromicroDefines()
    elif board == "ProMicro-I2C":
        boardBuild = "promicro_uf2/nrf52840/i2c"
        PromicroDefines()
    elif board == "XIAO":
        boardBuild = "xiao_ble/nrf52840"
        XiaoDefines()
    elif board == "XIAO-Sense":
        boardBuild = "xiao_ble/nrf52840/sense"
        XiaoSenseDefines()
    elif board == "Butterfly":
        boardBuild = "slimevrmini_p4r9_uf2/nrf52833"
        ButterflyDefines()
    elif board == "Chrysalis":
        boardBuild = "promicro_uf2/nrf52840/chrysalis"
        ChrysalisDefines()
    else:
        print("invalid board")

    subprocess.run(f"cd {root_path}/firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0 && west build --board {boardBuild}  --pristine=always SlimeVR-Tracker-nRF-{iteration} --build-dir SlimeVR-Tracker-nRF-{iteration}/build  --  -DNCS_TOOLCHAIN_VERSION=NONE  -DBOARD_ROOT=../SlimeVR-Tracker-nRF-{iteration}", shell=True)

    global firmwareFile
    firmwareFile = os.path.join(root_path, f"firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0/SlimeVR-Tracker-nRF-{iteration}/build/SlimeVR-Tracker-nRF-{iteration}/zephyr")

microcontrollers = [
    {
        "id": "ProMicro-SPI",
        "name": "ProMicro-SPI",
    },
    {
        "id": "ProMicro-I2C",
        "name": "ProMicro-I2C",
    },
    {
        "id": "XIAO-Sense",
        "name": "XIAO-Sense",
    },
    {
        "id": "XIAO",
        "name": "XIAO",
    },
    {
        "id": "Butterfly",
        "name": "Butterfly",
    },
        {
        "id": "Chrysalis",
        "name": "Chrysalis",
    }
]

imu_sensors = [
    {
        "id": "ICM-45686",
        "name": "ICM-45686",
    },
    {
        "id": "LSM6DSR",
        "name": "LSM6DSR",
    },
    {
        "id": "LSM6DSV",
        "name": "LSM6DSV",
    },
]

define_options = [
    {
        "name": "Hex Color",
        "description": "Type hex code for LED color (xiao, Chrysalis and butterfly only)",
        "type": "string",
        "defaultValue": "#0eeadf",
        "category": "Defines"
    },
    {
        "name": "Clock Pin",
        "description": "Select pin for external crystal oscillator",
        "type": "string",
        "defaultValue": "020",
        "category": "Defines"
    },
    {
        "name": "SW0 Pin",
        "description": "Select pin for User (SW0) button",
        "type": "string",
        "defaultValue": "000",
        "category": "Defines"
    },
    {
        "name": "VCC GPIO pin",
        "description": "set VCC to a GPIO pin if you have a defective promicro board",
        "type": "string",
        "defaultValue": "031",
        "category": "Defines"
    },
    {
        "name": "LP Timeout",
        "description": "Low Power Timeout in seconds",
        "type": "string",
        "defaultValue": "300",
        "category": "Defines"
    },
    {
        "name": "Sleep",
        "description": "Set if you want Sleep mode to be enabled",
        "type": "boolean",
        "defaultValue": False,
        "category": "Defines"
    },
]

@app.route('/api/microcontrollers', methods=['GET'])
def get_microcontrollers():
    """Get list of available microcontrollers"""
    return jsonify(microcontrollers)

@app.route('/api/imu-sensors', methods=['GET'])
def get_imu_sensors():
    """Get list of available IMU sensors"""
    return jsonify(imu_sensors)

@app.route('/api/define-options', methods=['GET'])
def get_define_options():
    """Get list of available define options"""
    return jsonify(define_options)

@app.route('/api/build-firmware', methods=['POST'])
def build_firmware():
    try:
        config = request.json
        logger.info(f"Building firmware with variables: {config}")
        
        mcu = config.get('mcu', '')
        imu = config.get('imu', '')
        defines = {}
        for define_option in define_options:
            define_name = define_option['name']
            if define_name in config:
                defines[define_name] = config[define_name]
        hex = config.get('Hex Color', '')
        clk = config.get('Clock Pin', '')
        sw0 = config.get('SW0 Pin', '')
        vccGpio = config.get('VCC GPIO pin', '')
        lp = config.get('LP Timeout', '')
        sleep = config.get('Sleep', '')

        logger.info("=== COLLECTED VARIABLES ===")
        logger.info(f"MCU: {mcu}")
        logger.info(f"IMU: {imu}")
        logger.info("Define Variables:")
        for name, value in defines.items():
            logger.info(f"  {name} = {value} ({type(value).__name__})")
        logger.info("===========================")

        build(mcu, imu, hex, clk, sw0, vccGpio, lp, sleep)

        global uf2Path
        uf2Path = os.path.join(firmwareFile, "zephyr.uf2") 
            
        return jsonify(uf2Path)
        
    except Exception as e:
        logger.error(f"Build firmware error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    
@app.route('/api/download-firmware', methods=['POST'])
def download_firmware():
    try:
        return send_file(
            uf2Path,
            as_attachment=True,
            download_name='zephyr.uf2',
        )
    

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fetch-prebuild', methods=['POST'])
def fetch_prebuild():

    try:
        iteration = iterate(False)

        firmware_url = request.get_data(as_text=True)
        logger.info(firmware_url)
        
        global prebuiltURLs
        prebuiltURLs = []
        prebuiltURLs.append(firmware_url)

        subprocess.run(f"cd {root_path}/uploads/ && wget -O firmware{iteration}.uf2 {firmware_url}", shell=True)
    
        uf2Path = os.path.join(root_path, f"uploads/firmware{iteration}.uf2") 

        return send_file(
            uf2Path,
            as_attachment=True,
            download_name="firmware.uf2",
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
#@app.route('/api/delete-cache', methods=['POST'])
#def delete_cache():
#   try:
#        for i in range (prebuiltURLs.len):
#            subprocess.run(f"cd {root_path}/uploads/ && rm -r {prebuiltURLs[i]}", shell=True)
#            logger.info("deleted prebuild cache")
#
#        for i in range(0, iteration):
#            subprocess.run(f"cd {root_path}/firmware/~/.toolchain-nrf52/nrf52-sdk-3.1.0 && rm -r SlimeVR-Tracker-nRF-{i}", shell=True)
#            logger.info("deleted build cache")
#
#        iterate(True)
#
#        return jsonify("deleted cache")
#    except Exception as e:
#        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)