import { useState, useEffect } from "react";
import { AlertCircle, Upload, ArrowRight, RotateCcw } from "lucide-react";
const API_BASE_URL = "https://smol.aed-dev.com/backend/api";
//const API_BASE_URL = "http://127.0.0.1:8000/api";

class Nrf52DfuFlasher {
  constructor(serialPort) {
    this.serialPort = serialPort;
  }

  async sleepMillis(millis) {
    await new Promise((resolve) => {
      setTimeout(resolve, millis);
    });
  }

  async enterDfuMode() {
    let writer = null;

    await this.serialPort.open({
      baudRate: 115200,
    });

    writer = this.serialPort.writable.getWriter();

    await writer.write(new TextEncoder().encode("dfu\r\n"));
    await this.sleepMillis(100);

    writer.releaseLock();

    await this.sleepMillis(1500);
  }
}

const STEPS = {
  CHOOSE_MODE: "choose_mode",
  UPLOAD_FILE: "upload_file",
  SELECT_HARDWARE: "select_hardware",
  SELECT_PREBUILD: "select_prebuild",
  CONFIGURE: "configure",
  CONNECT_DEVICE: "connect_device",
  SAVE_FILE: "save_file",
  COMPLETE: "complete",
  DFU: "enter_dfu",
  DFUNew: "DFUNew",
};

const MicrocontrollerFlasher = () => {
  const [currentStep, setCurrentStep] = useState(STEPS.CHOOSE_MODE);
  const [flashMode, setFlashMode] = useState(null);
  const [microcontrollers, setMicrocontrollers] = useState([]);
  const [imuSensors, setImuSensors] = useState([]);
  const [defineOptions, setDefineOptions] = useState([]);
  const [selectedMCU, setSelectedMCU] = useState("");
  const [selectedIMU, setSelectedIMU] = useState("");
  const [selectedPRE, setSelectedPRE] = useState("");
  const [defines, setDefines] = useState({});
  const [firmwareFile, setFirmwareFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [pendingFirmware, setPendingFirmware] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [firmwareList, setFirmwareList] = useState("");
  const [recieverFirmwareList, setRecieverFirmwareList] = useState("");
  const [showIMU, setShowIMU] = useState(true);
  const [continueDefines, setContinueDefines] = useState(false);
  const [isChromium, setIsChromium] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [mcusResponse, imusResponse, definesResponse] = await Promise.all(
          [
            fetch(`${API_BASE_URL}/microcontrollers`),
            fetch(`${API_BASE_URL}/imu-sensors`),
            fetch(`${API_BASE_URL}/define-options`),
          ]
        );

        const [mcusData, imusData, definesData] = await Promise.all([
          mcusResponse.json(),
          imusResponse.json(),
          definesResponse.json(),
        ]);

        setMicrocontrollers(mcusData);
        setImuSensors(imusData);
        setDefineOptions(definesData);

        if (!!window.chrome) {
          setIsChromium(true);
        } else {
          setIsChromium(false);
        }

        const recieverFirmwareNames = [
          {
            name: "Etee",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_etee_Receiver.uf2",
          },
          {
            name: "Holyiot",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Holyiot_Dongle_Receiver.hex",
          },
          {
            name: "Ebyte",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Nordic_eByte_Dongle_Receiver.hex",
          },
          {
            name: "ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_ProMicro_Receiver.uf2v",
          },
          {
            name: "XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_XIAO_Receiver.uf2",
          },
        ];

        const trackerFirmwareNames = [
          {
            name: "Chrysalis-Mag",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_Chrysalis_Mag_ProMicro.uf2",
          },
          {
            name: "Chrysalis",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_Chrysalis_ProMicro.uf2",
          },
          {
            name: "CLK-I2C-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_CLK_I2C_Mag_ProMicro.uf2",
          },
          {
            name: "CLK-I2C-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_CLK_I2C_ProMicro.uf2",
          },
          {
            name: "CLK-Mag-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_CLK_Mag_XIAO.uf2",
          },
          {
            name: "CLK-SPI-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_CLK_SPI_Mag_ProMicro.uf2",
          },
          {
            name: "CLK-SPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_CLK_SPI_ProMicro.uf2",
          },
          {
            name: "CLK-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_CLK_XIAO.uf2",
          },
          {
            name: "I2C-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_I2C_Mag_ProMicro.uf2",
          },
          {
            name: "I2C-Mag-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_I2C_Mag_StackedSmol.uf2",
          },
          {
            name: "I2C-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_I2C_ProMicro.uf2",
          },
          {
            name: "I2C-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_I2C_StackedSmol.uf2",
          },
          {
            name: "Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_Mag_ProMicro.uf2",
          },
          {
            name: "Mag-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_Mag_XIAO.uf2",
          },
          {
            name: "Mochi",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_Mochi.uf2",
          },
          {
            name: "NoCLK-I2C-Mag-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoCLK_I2C_Mag_StackedSmol.uf2",
          },
          {
            name: "NoCLK-I2C-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoCLK_I2C_StackedSmol.uf2",
          },
          {
            name: "NoCLK-NoSleep-I2C-Mag-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoCLK_NoSleep_I2C_Mag_StackedSmol.uf2",
          },
          {
            name: "NoCLK-NoSleep-I2C-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoCLK_NoSleep_I2C_StackedSmol.uf2",
          },
          {
            name: "NoCLK-NoSleep-SPI-Mag-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoCLK_NoSleep_SPI_Mag_StackedSmol.uf2",
          },
          {
            name: "NoCLK-NoSleep-SPI-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoCLK_NoSleep_SPI_StackedSmol.uf2",
          },
          {
            name: "NoCLK-SPI-Mag-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoCLK_SPI_Mag_StackedSmol.uf2",
          },
          {
            name: "NoCLK-SPI-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoCLK_SPI_StackedSmol.uf2",
          },
          {
            name: "NoSleep-CLK-I2C-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleepCLK_I2C_Mag_ProMicro.uf2",
          },
          {
            name: "NoSleep-CLK-I2C-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleepCLK_I2C_ProMicro.uf2",
          },
          {
            name: "NoSleep-CLK-Mag-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleepCLK_Mag_XIAO.uf2",
          },
          {
            name: "NoSleep-CLK-SPI-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleepCLK_SPI_Mag_ProMicro.uf2",
          },
          {
            name: "NoSleep-CLK-SPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleepCLK_SPI_ProMicro.uf2",
          },
          {
            name: "NoSleep-CLK-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleepCLK_XIAO.uf2",
          },
          {
            name: "Nosleep-Chrysalis-Mag",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_Chrysalis_Mag_ProMicro.uf2",
          },
          {
            name: "NoSleep-Chrysalis",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_Chrysalis_ProMicro.uf2",
          },
          {
            name: "NoSleep-I2C-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_I2C_Mag_ProMicro.uf2",
          },
          {
            name: "NoSleep-I2C-Mag-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_I2C_Mag_StackedSmol.uf2",
          },
          {
            name: "NoSleep-I2C-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_I2C_ProMicro.uf2",
          },
          {
            name: "NoSleep-I2C-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_I2C_StackedSmol.uf2",
          },
          {
            name: "NoSleep-Mag-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_Mag_XIAO.uf2",
          },
          {
            name: "NoSleep-Mochi",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_Mochi.uf2",
          },
          {
            name: "NoSleep-R3",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_R3.uf2",
          },
          {
            name: "NoSleep-Butterfly-R9",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_SlimevrMini4R9.uf2",
          },
          {
            name: "NoSleep-smSPI-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_smSPI_Mag_ProMicro.uf2",
          },
          {
            name: "NoSleep-smSPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_smSPI_ProMicro.uf2",
          },
          {
            name: "NoSleep-SPI-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_SPI_Mag_ProMicro.uf2",
          },
          {
            name: "NoSleep-SPI-Mag-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_SPI_Mag_StackedSmol.uf2",
          },
          {
            name: "NoSleep-SPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_SPI_ProMicro.uf2",
          },
          {
            name: "NoSleep-SPI-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_SPI_StackedSmol.uf2",
          },
          {
            name: "NoSleep-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_XIAO.uf2",
          },
          {
            name: "NoSleep-XIAO-Sense",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_XIAO_Sense.uf2",
          },
          {
            name: "ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_ProMicro.uf2",
          },
          {
            name: "R3",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_R3.uf2",
          },
          {
            name: "Butterfly-R9",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SlimevrMini4R9.uf2",
          },
          {
            name: "smSPI-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_smSPI_Mag_ProMicro.uf2",
          },
          {
            name: "smSPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_smSPI_ProMicro.uf2",
          },
          {
            name: "SPI-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SPI_Mag_ProMicro.uf2",
          },
          {
            name: "SPI-Mag-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SPI_Mag_StackedSmol.uf2",
          },
          {
            name: "SPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SPI_ProMicro.uf2",
          },
          {
            name: "SPI-Stacked",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SPI_StackedSmol.uf2",
          },
          {
            name: "SW0-CLK-I2C-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_CLK_I2C_Mag_ProMicro.uf2",
          },
          {
            name: "SW0-SLK-SPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_CLK_I2C_ProMicro.uf2",
          },
          {
            name: "SW0-CLK-Mag-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_CLK_Mag_XIAO.uf2",
          },
          {
            name: "SW0-I2C-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_CLK_SPI_Mag_ProMicro.uf2",
          },
          {
            name: "SW0-I2C-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_CLK_SPI_ProMicro.uf2",
          },
          {
            name: "SW0-CLK-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_CLK_XIAO.uf2",
          },
          {
            name: "SW0-I2C-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_I2C_Mag_ProMicro.uf2",
          },
          {
            name: "SW0-I2C-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_I2C_ProMicro.uf2",
          },
          {
            name: "SW0-Mag-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_Mag_XIAO.uf2",
          },
          {
            name: "SW0-NoSleep-CLK-I2C-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleepCLK_I2C_Mag_ProMicro.uf2",
          },
          {
            name: "SW0-NoSleep-CLK-I2C-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleepCLK_I2C_ProMicro.uf2",
          },
          {
            name: "SW0-NoSleep-CLK-Mag-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleepCLK_Mag_XIAO.uf2",
          },
          {
            name: "SW0-NoSleep-CLK-SPI-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleepCLK_SPI_Mag_ProMicro.uf2",
          },
          {
            name: "SW0-NoSleep-CLK-SPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleepCLK_SPI_ProMicro.uf2",
          },
          {
            name: "SW0-NoSleep-CLK-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleepCLK_XIAO.uf2",
          },
          {
            name: "SW0-NoSleep-I2C-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleep_I2C_Mag_ProMicro.uf2",
          },
          {
            name: "SW0-NoSleep-I2C-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleep_I2C_ProMicro.uf2",
          },
          {
            name: "SW0-NoSleep-Mag-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleep_Mag_XIAO.uf2",
          },
          {
            name: "SW0-NoSleep-smSPI-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleep_smSPI_Mag_ProMicro.uf2",
          },
          {
            name: "SW0-NoSleep-smSPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleep_smSPI_ProMicro.uf2",
          },
          {
            name: "SW0-NoSleep-SPI-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleep_SPI_Mag_ProMicro.uf2",
          },
          {
            name: "SW0-NoSleep-SPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleep_SPI_ProMicro.uf2",
          },
          {
            name: "SW0-NoSleep-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleep_XIAO.uf2",
          },
          {
            name: "SW0-NoSleep-XIAO-Sense",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_NoSleep_XIAO_Sense.uf2",
          },
          {
            name: "SW0-smSPI-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_smSPI_Mag_ProMicro.uf2",
          },
          {
            name: "SW0-smSPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_smSPI_ProMicro.uf2",
          },
          {
            name: "SW0-SPI-Mag-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_SPI_Mag_ProMicro.uf2",
          },
          {
            name: "SW0-SPI-ProMicro",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_SPI_ProMicro.uf2",
          },
          {
            name: "SW0-XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_XIAO.uf2",
          },
          {
            name: "SW0-XIAO-Sense",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SW0_XIAO_Sense.uf2",
          },
          {
            name: "XIAO",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_XIAO.uf2",
          },
          {
            name: "XIAO-Sense",
            url: "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_XIAO_Sense.uf2",
          },
        ];

        setFirmwareList(
          trackerFirmwareNames.map((a) => ({
            name: a.name,
            url: a.url,
          }))
        );

        setRecieverFirmwareList(
          recieverFirmwareNames.map((a) => ({
            name: a.name,
            url: a.url,
          }))
        );

        const initialDefines = {};
        definesData.forEach((define) => {
          initialDefines[define.name] = define.defaultValue;
        });
        setDefines(initialDefines);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const resetWorkflow = () => {
    setCurrentStep(STEPS.CHOOSE_MODE);
    setFlashMode(null);
    setSelectedMCU("");
    setSelectedIMU("");
    setFirmwareFile(null);
    setPendingFirmware(null);
    setError(null);
    setProgress(0);
    setStatusMessage("");
    setIsProcessing(false);
    setShowIMU(true);
  };

  const handleModeSelect = (mode) => {
    setFlashMode(mode);
    setError(null);

    if (mode === "build") {
      setCurrentStep(STEPS.SELECT_HARDWARE);
    } else if (mode === "uf2") {
      setCurrentStep(STEPS.UPLOAD_FILE);
    } else {
      setCurrentStep(STEPS.SELECT_PREBUILD);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().endsWith(".uf2")) {
      setFirmwareFile(file);
      setError(null);
      setCurrentStep(STEPS.CONNECT_DEVICE);
    } else {
      setError("Please select a valid .uf2 file");
    }
  };

  const handleHardwareNext = () => {
    setError(null);
    setCurrentStep(STEPS.CONFIGURE);
  };

  const handleDfuNext = () => {
    setError(null);
    setCurrentStep(STEPS.SAVE_FILE);
  };

  const handleConfigureNext = async () => {
    if (
      selectedMCU == "Chrysalis" &&
      defines["Hex Color"] == "#0eeadf" &&
      defines["LP Timeout"] == "300" &&
      defines["Sleep"] == false
    ) {
      await downloadPre(
        "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_Chrysalis_ProMicro.uf2"
      );
      setError(null);
      setCurrentStep(STEPS.DFU);
      EnterDfu();
    } else if (
      selectedMCU == "Butterfly" &&
      defines["Hex Color"] == "#0eeadf" &&
      defines["LP Timeout"] == "300" &&
      defines["Sleep"] == false
    ) {
      await downloadPre(
        "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_SlimevrMini4.uf2"
      );
      setError(null);
      EnterDfu();
    } else if (
      selectedMCU == "XIAO-Sense" &&
      defines["Hex Color"] == "#0eeadf" &&
      defines["LP Timeout"] == "300" &&
      defines["Sleep"] == false &&
      defines["Clock Pin"] == "020"
    ) {
      await downloadPre(
        "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_XIAO_Sense.uf2"
      );
      setError(null);
      setCurrentStep(STEPS.DFU);
      EnterDfu();
    } else if (
      selectedMCU == "ProMicro-SPI" &&
      defines["Hex Color"] == "#0eeadf" &&
      defines["LP Timeout"] == "300" &&
      defines["Sleep"] == false &&
      defines["VCC GPIO pin"] == "031" &&
      defines["SW0 Pin"] == "000" &&
      defines["Clock Pin"] == "020"
    ) {
      await downloadPre(
        "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_SPI_ProMicro.uf2"
      );
      setError(null);
      setCurrentStep(STEPS.DFU);
      EnterDfu();
    } else if (
      selectedMCU == "ProMicro-I2C" &&
      defines["Hex Color"] == "#0eeadf" &&
      defines["LP Timeout"] == "300" &&
      defines["Sleep"] == false &&
      defines["VCC GPIO pin"] == "031" &&
      defines["SW0 Pin"] == "000" &&
      defines["Clock Pin"] == "020"
    ) {
      await downloadPre(
        "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_I2C_ProMicro.uf2"
      );
      setError(null);
      setCurrentStep(STEPS.DFU);
      EnterDfu();
    } else if (
      selectedMCU == "XIAO" &&
      defines["Hex Color"] == "#0eeadf" &&
      defines["LP Timeout"] == "300" &&
      defines["Sleep"] == false &&
      defines["VCC GPIO pin"] == "031" &&
      defines["SW0 Pin"] == "100" &&
      defines["Clock Pin"] == "020"
    ) {
      await downloadPre(
        "https://github.com/Shine-Bright-Meow/SlimeNRF-Firmware-CI/releases/download/latest/SlimeNRF_Tracker_NoSleep_XIAO.uf2"
      );
      setError(null);
      setCurrentStep(STEPS.DFU);
      EnterDfu();
    } else {
      setCurrentStep(STEPS.CONNECT_DEVICE);
    }
  };

  const handleDefineChange = (defineName, value) => {
    setDefines((prev) => ({
      ...prev,
      [defineName]: value,
    }));
  };

  const handleConnectAndProcess = async () => {
    try {
      let port;
      setIsProcessing(true);
      setError(null);
      setProgress(0);

      if (flashMode === "build") {
        const config = {
          mcu: selectedMCU,
          imu: selectedIMU,
          "Hex Color": defines["Hex Color"] || "",
          "Clock Pin": defines["Clock Pin"] || "",
          "SW0 Pin": defines["SW0 Pin"] || "",
          "VCC GPIO pin": defines["VCC GPIO pin"] || "",
          "LP Timeout": defines["LP Timeout"] || "",
          Sleep: defines["Sleep"] || false,
        };

        const buildResponse = await fetch(`${API_BASE_URL}/build-firmware`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        setProgress(100);

        const buildData = await buildResponse.json();

        const uf2Response = await fetch(`${API_BASE_URL}/download-firmware`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zipPath: buildData.zipPath }),
        });

        const firmwareBlob = await uf2Response.blob();
        setPendingFirmware({
          blob: firmwareBlob,
          name: "firmware.uf2",
        });
      } else {
        setPendingFirmware({
          blob: firmwareFile,
          name: firmwareFile.name,
        });
      }
      setStatusMessage("Ready to save firmware to device");
      EnterDfu();

      await port.close();
      setIsProcessing(false);
    } catch (error) {
      setError(`Process failed: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleSaveToDevice = async () => {
    try {
      setError(null);

      const dirPicker = await window.showDirectoryPicker();

      setStatusMessage("Saving firmware file...");
      const fileHandle = await dirPicker.getFileHandle(pendingFirmware.name, {
        create: true,
      });

      const writable = await fileHandle.createWritable();
      await writable.write(pendingFirmware.blob);
      await writable.close();

      setStatusMessage("Firmware saved successfully!");
      setCurrentStep(STEPS.COMPLETE);
    } catch (error) {
      if (
        error.message ==
        "Failed to execute 'showDirectoryPicker' on 'Window': The user aborted a request."
      ) {
        setError("User Closed Popup, please reopen it and select drive.");
      } else if (error.message == "Failed to perform Safe Browsing check.") {
        setStatusMessage("Firmware saved successfully!");
        setCurrentStep(STEPS.COMPLETE);
      } else {
        setError(`Failed to save file: ${error.message}`);
      }
    }
  };

  const getFilteredDefines = () => {
    if (selectedMCU.includes("XIAO-Sense")) {
      return defineOptions.filter(
        (define) =>
          define.name !== "Clock Pin" && define.name !== "VCC GPIO pin"
      );
    } else if (
      selectedMCU.includes("Butterfly") ||
      selectedMCU.includes("Chrysalis")
    ) {
      return defineOptions.filter(
        (define) =>
          define.name !== "Clock Pin" &&
          define.name !== "VCC GPIO pin" &&
          define.name !== "SW0 Pin"
      );
    }

    return defineOptions;
  };

  const downloadPreList = async (pre) => {
    await downloadPre(pre);

    setCurrentStep(STEPS.DFU);

    await EnterDfu();
  };

  const downloadPre = async (url) => {
    const uf2Response = await fetch(`${API_BASE_URL}/fetch-prebuild`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: url,
    });
    const firmwareBlob = await uf2Response.blob();
    console.log(firmwareBlob.name);
    setPendingFirmware({
      blob: firmwareBlob,
      name: "firmware.uf2",
    });
  };

  const EnterDfu = async () => {
    let port;
    port = await navigator.serial.requestPort();

    await this.serialPort.open({
      baudRate: 115200,
    });

    const writer = this.serialPort.writable.getWriter();
    const reader = port.readable.getReader();

    await writer.write(new TextEncoder().encode("meow\r\n"));
    writer.releaseLock();

    const { value } = await Promise.race([
      reader.read(),
      new Promise((_, reject) => setTimeout(() => reject("timeout"), 500)),
    ]).catch(() => ({ value: null }));

    reader.releaseLock();

    if (value) {
      setCurrentStep(STEPS.DFU);
      await flasher.enterDfuMode();
    } else {
      setCurrentStep(STEPS.DFUNew);
    }

    const flasher = new Nrf52DfuFlasher(port);
    await flasher.enterDfuMode();
  };

  const FlashMultiple = () => {
    setError(null);
    EnterDfu();
  };

  const changeSelectedMCU = (value) => {
    const mcusWithoutIMU = ["Chrysalis", "Butterfly", "XIAO-Sense"];
    const needsIMU = !mcusWithoutIMU.includes(value);

    if (!needsIMU) {
      setShowIMU(false);
      setSelectedIMU("");
      setContinueDefines(true);
    } else {
      setShowIMU(true);
      setContinueDefines(selectedMCU && selectedIMU);
    }
    setSelectedMCU(value);
  };

  const changeSelectedIMU = (value) => {
    setSelectedIMU(value);

    setContinueDefines(selectedMCU && value);
  };

  const filteredDefineOptions = getFilteredDefines();

  const categorizedDefines = filteredDefineOptions.reduce((acc, define) => {
    if (!acc[define.category]) {
      acc[define.category] = [];
    }
    acc[define.category].push(define);
    return acc;
  }, {});

  const renderDefineInput = (define) => {
    const currentValue = defines[define.name];

    switch (define.type) {
      case "boolean":
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(currentValue)}
              onChange={(e) =>
                handleDefineChange(define.name, e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        );

      case "select":
        return (
          <select
            value={String(currentValue)}
            onChange={(e) => handleDefineChange(define.name, e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 focus:ring-blue-500 focus:border-blue-500"
          >
            {define.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "number":
        return (
          <input
            type="number"
            value={Number(currentValue)}
            onChange={(e) =>
              handleDefineChange(define.name, parseInt(e.target.value, 10))
            }
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 focus:ring-blue-500 focus:border-blue-500 w-24"
          />
        );

      default:
        return (
          <input
            type="text"
            value={String(currentValue)}
            onChange={(e) => handleDefineChange(define.name, e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 focus:ring-blue-500 focus:border-blue-500"
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="text-gray-400 mt-6 text-lg">Loading configs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 text-white overflow-auto">
      <div className="w-full px-6 py-8 min-h-full">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              SlimeVR nRF Firmware Flasher
            </h1>

            {!isChromium && (
              <div className="mb-8 p-4 bg-red-900/50 border border-red-700 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-300">
                    Please switch to a chromium based broswer such as google
                    chrome or opera gx.
                  </p>
                </div>
              </div>
            )}

            {currentStep !== STEPS.CHOOSE_MODE && (
              <button
                onClick={resetWorkflow}
                className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-all duration-300 flex items-center gap-2 mx-auto"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
            )}
          </div>
          {error && (
            <div className="mb-8 p-4 bg-red-900/50 border border-red-700 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}
          {isProcessing && (
            <div className="mb-8 p-6 bg-blue-900/30 border border-blue-700/50 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <p className="text-blue-300 font-medium">{statusMessage}</p>
              </div>
              <div className="relative w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-blue-400 text-sm mt-2 font-mono">
                {progress}% complete
              </p>
            </div>
          )}
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 backdrop-blur-sm">
            {currentStep === STEPS.CHOOSE_MODE && (
              <div className="text-center">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-4">
                    How do you want to build your firmware?
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <button
                    onClick={() => handleModeSelect("pre")}
                    disabled={!isChromium}
                    className="p-8 bg-gray-700 border border-gray-600 rounded-2xl hover:bg-gray-600 transition-all duration-300"
                  >
                    <h3 className="text-xl font-semibold mb-2">
                      Prebuilt Firmware
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Select a prebuilt firmware file from a list
                    </p>
                  </button>

                  <button
                    onClick={() => handleModeSelect("build")}
                    disabled={!isChromium}
                    className="p-8 bg-gray-700 border border-gray-600 rounded-2xl hover:bg-gray-600 transition-all duration-300"
                  >
                    <h3 className="text-xl font-semibold mb-2">
                      Custom Firmware
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Use custom defines for non-standard trackers
                    </p>
                  </button>

                  <button
                    onClick={() => handleModeSelect("uf2")}
                    disabled={!isChromium}
                    className="p-8 bg-gray-700 border border-gray-600 rounded-2xl hover:bg-gray-600 transition-all duration-300"
                  >
                    <h3 className="text-xl font-semibold mb-2">
                      .UF2 Firmware
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Flash a uf2 file from your computer to the tracker
                    </p>
                  </button>
                </div>
              </div>
            )}

            {currentStep === STEPS.UPLOAD_FILE && (
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">Upload Firmware</h2>
                <p className="text-gray-400 mb-8">
                  Upload the .uf2 firmware file
                </p>

                <div className="max-w-lg mx-auto">
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".uf2"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-gray-600 group-hover:border-gray-500 rounded-xl p-12 text-center transition-colors">
                      <Upload className="w-16 h-16 text-gray-500 group-hover:text-gray-400 mx-auto mb-4 transition-colors" />
                      <p className="text-gray-400 group-hover:text-gray-300 text-lg">
                        {firmwareFile
                          ? firmwareFile.name
                          : "Click or drag to upload .uf2 file"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === STEPS.SELECT_HARDWARE && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">Select Hardware</h2>
                  <p className="text-gray-400">
                    Choose which Board Format and IMU you are using
                  </p>
                </div>
                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <label className="block text-lg font-medium text-gray-300 mb-3">
                      Board Format
                    </label>
                    <select
                      value={selectedMCU}
                      onChange={(e) => changeSelectedMCU(e.target.value)}
                      className="w-full px-4 py-4 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Choose your Board Format</option>
                      {microcontrollers.map((mcu) => (
                        <option key={mcu.id} value={mcu.id}>
                          {mcu.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {showIMU && (
                    <div>
                      <label className="block text-lg font-medium text-gray-300 mb-3">
                        IMU
                      </label>
                      <select
                        value={selectedIMU}
                        onChange={(e) => changeSelectedIMU(e.target.value)}
                        className="w-full px-4 py-4 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="">Choose your IMU</option>
                        {imuSensors.map((imu) => (
                          <option key={imu.id} value={imu.id}>
                            {imu.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="pt-6">
                    <button
                      onClick={handleHardwareNext}
                      disabled={!continueDefines}
                      className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                        !continueDefines
                          ? "bg-gray-600 cursor-not-allowed text-gray-400"
                          : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
                      }`}
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === STEPS.SELECT_PREBUILD && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">Select Prebuild</h2>
                  <p className="text-gray-400">
                    Choose which Prebuilt firmware you want
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <label className="block text-lg font-medium text-gray-300 mb-3">
                      Tracker Firmware
                    </label>
                    <select
                      value={selectedPRE}
                      onChange={(e) => setSelectedPRE(e.target.value)}
                      className="w-full px-4 py-4 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Choose your Prebuilt firmware</option>
                      {firmwareList.map((firm) => (
                        <option key={firm.url} value={firm.url}>
                          {firm.name}
                        </option>
                      ))}
                    </select>

                    <label className="block text-lg font-medium text-gray-300 mb-3">
                      Reciever Firmware
                    </label>
                    <select
                      value={selectedPRE}
                      onChange={(e) => setSelectedPRE(e.target.value)}
                      className="w-full px-4 py-4 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Choose your Prebuilt firmware</option>
                      {recieverFirmwareList.map((firm) => (
                        <option key={firm.url} value={firm.url}>
                          {firm.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={(e) => downloadPreList(selectedPRE)}
                      disabled={!selectedPRE}
                      className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                        !selectedPRE
                          ? "bg-gray-600 cursor-not-allowed text-gray-400"
                          : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
                      }`}
                    >
                      <span>Download firmware and enter DFU</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === STEPS.CONFIGURE &&
              Object.keys(categorizedDefines).length > 0 && (
                <div>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-4">
                      Configure Defines
                    </h2>
                  </div>

                  <div className="max-w-4xl mx-auto space-y-8">
                    {Object.entries(categorizedDefines).map(
                      ([category, categoryDefines]) => (
                        <div key={category}>
                          <h3 className="text-xl font-semibold text-gray-200 mb-6 border-b border-gray-700 pb-2">
                            {category}
                          </h3>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categoryDefines.map((define) => (
                              <div
                                key={define.name}
                                className="p-4 bg-gray-700/30 rounded-lg"
                              >
                                <div className="mb-3">
                                  <label className="block text-sm font-medium text-gray-300">
                                    {define.name}
                                  </label>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {define.description}
                                  </p>
                                </div>
                                <div>{renderDefineInput(define)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}

                    <div className="pt-6">
                      <button
                        onClick={handleConfigureNext}
                        className="w-full py-4 px-6 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-xl text-lg transition-all duration-300 flex items-center justify-center gap-3"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

            {currentStep === STEPS.CONNECT_DEVICE && (
              <div className="text-center">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-4">
                    Connect Your Tracker
                  </h2>
                  <p className="text-gray-400 mb-6">
                    {flashMode === "build"
                      ? "Ready to build firmware and connect to your tracker"
                      : "Ready to connect to your device and enter DFU mode"}
                  </p>
                  <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-blue-300 text-sm">
                      Connect your tracker via USB and click the button below
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleConnectAndProcess}
                  disabled={isProcessing}
                  className={`py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 mx-auto ${
                    isProcessing
                      ? "bg-gray-600 cursor-not-allowed text-gray-400"
                      : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>
                        Building... This may take a while so be patient (ETA. 2
                        minutes){" "}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Connect & Build</span>
                    </>
                  )}
                </button>

                {isProcessing ? (
                  <>
                    <br />
                    <a
                      href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                      target="_blank"
                      className="underline text-blue-500"
                    >
                      listen to a nice song while you wait!
                    </a>
                  </>
                ) : (
                  <></>
                )}
              </div>
            )}

            {currentStep === STEPS.DFU && (
              <div className="text-center">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-4">
                    Connect Your Tracker
                  </h2>
                  <p className="text-gray-400 mb-6">
                    Select your tracker in the Popup then click the continue
                    button
                  </p>
                </div>
                <div className="pt-6">
                  <button
                    onClick={handleDfuNext}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-blue-500/25 transform hover:scale-105
                      `}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === STEPS.DFUNew && (
              <div className="text-center">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-4">
                    Connect Your Tracker
                  </h2>
                  <p className="text-gray-400 mb-6">
                    Double click RST button or short pins RST and GND twice in
                    quick sucession.
                  </p>
                </div>
                <div className="pt-6">
                  <button
                    onClick={handleDfuNext}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-blue-500/25 transform hover:scale-105
                      `}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === STEPS.SAVE_FILE && (
              <div className="text-center">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-4">
                    Flash Firmware to Tracker
                  </h2>
                  <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 max-w-md mx-auto mb-6">
                    <p className="text-green-300 text-sm">
                      The Tracker should appear as a new drive called NICENANO
                      or SLIMENRFTRK, select this in the popup to flash your
                      firmware, if any additional popups open, click allow on
                      them all.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleSaveToDevice}
                    className="py-4 px-8 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-lg transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-green-500/25 transform hover:scale-105"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Select Drive</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === STEPS.COMPLETE && (
              <div className="text-center">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-4">
                    Firmware Flashed Successfully!
                  </h2>
                  <p className="text-gray-400 mb-6">
                    The Tracker has been flashed with the new firmware and
                    should now boot with the updated Firmware.
                  </p>
                  <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 max-w-md mx-auto mb-8">
                    <p className="text-green-300 text-sm">
                      The tracker should automatically reboot and now has the
                      firmware flashed!
                    </p>
                  </div>
                </div>
                <button
                  onClick={FlashMultiple}
                  className="py-4 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-all duration-300 flex items-center gap-3 mx-auto shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Flash Another Device With Same Firmware</span>
                </button>
                <br />
                <button
                  onClick={resetWorkflow}
                  className="py-4 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-all duration-300 flex items-center gap-3 mx-auto shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Restart Process</span>
                </button>
              </div>
            )}
          </div>
          <a className="text-gray-500 opacity-50">made by </a>{" "}
          <a
            href="https://github.com/Aed-1"
            target="_blank"
            className="text-gray-500 opacity-50 hover:underline hover:text-blue-500 hover:opacity-100"
          >
            AED
          </a>
        </div>
      </div>
    </div>
  );
};

export default MicrocontrollerFlasher;
