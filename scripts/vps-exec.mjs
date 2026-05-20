import { Client } from "ssh2";

const { VPS_HOST, VPS_USER = "root", VPS_PASSWORD, VPS_COMMAND } = process.env;

if (!VPS_HOST || !VPS_PASSWORD || !VPS_COMMAND) {
  throw new Error("VPS_HOST, VPS_PASSWORD, and VPS_COMMAND are required");
}

const client = new Client();

const result = await new Promise((resolve, reject) => {
  let stdout = "";
  let stderr = "";

  client
    .on("ready", () => {
      client.exec(VPS_COMMAND, (error, stream) => {
        if (error) {
          client.end();
          reject(error);
          return;
        }

        stream
          .on("close", (code) => {
            client.end();
            resolve({ code, stdout, stderr });
          })
          .on("data", (data) => {
            stdout += data.toString();
          })
          .stderr.on("data", (data) => {
            stderr += data.toString();
          });
      });
    })
    .on("error", reject)
    .connect({
      host: VPS_HOST,
      username: VPS_USER,
      password: VPS_PASSWORD,
      readyTimeout: 30000,
    });
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exitCode = result.code;
