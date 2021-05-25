const { app, Tray, Menu, net } = require("electron");
const yaml = require("js-yaml");
const fs = require("fs");
const os = require("os");
const path = require("path");

const iconPath = path.join(__dirname, "chia.png");

let tray = null;

const version = "mainnet";

function getConfig(version) {
  const config_root_dir =
    "CHIA_ROOT" in process.env
      ? process.env.CHIA_ROOT
      : path.join(os.homedir(), ".chia", version);
  const config = yaml.load(
    fs.readFileSync(path.join(config_root_dir, "config/config.yaml"), "utf8")
  );
  return config;
}
const config = getConfig(version);
function request() {
  return new Promise((resolve, reject) => {
    try {
      const request = net.request(
        `https://api2.chiaexplorer.com/balance/${config.farmer.xch_target_address}`
      );
      request.on("response", (response) => {
        let text = "";
        response.on("data", (chunk) => {
          text += chunk;
        });
        response.on("end", () => {
          try {
            let json = JSON.parse(text);
            resolve(json.netBalance / 1000000000000);
          } catch (error) {
            tray.setTitle("Error, reopen.");
          }
        });
        response.on("error", (error) => {
          reject(error);
        });
      });
      request.end();
    } catch (error) {
      reject(error);
    }
  });
}
function getData() {
  request()
    .then((chia) => {
      tray.setTitle(`${chia} XCH`);
    })
    .catch((error) => {
      tray.setTitle("Error, reopen.");
    });
}

app.on("ready", function () {
  tray = new Tray(iconPath);
  tray.setTitle("Loading...");

  getData();

  setInterval(() => {
    getData();
  }, 3000);

  var contextMenu = Menu.buildFromTemplate([
    {
      label: `Chia Bar ${app.getVersion()}`,
      type: "normal",
      enabled: false,
    },
    {
      label: "Donations",
      type: "normal",
      click() {
        require("electron").shell.openExternal(
          "https://github.com/EstebanFuentealba/chia-bar#donations"
        );
      },
    },
    {
      label: "Quit",
      accelerator: "Command+Q",
      selector: "terminate:",
    },
  ]);

  tray.setContextMenu(contextMenu);
});
