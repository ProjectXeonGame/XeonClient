<template>
  <div id="terminal" class="terminal">
    <div
      class="terminal_output terminal"
      :style="'font-family: ' + terminalFont + ';'"
    >
      {{ output }}
    </div>
    <div class="terminal_input_line terminal">
      <div
        class="terminal_input_prompt terminal"
        style="font-family: {{ terminalFont }};"
      >
        {{ prompt }}
      </div>
      <input
        ref="inputRef"
        type="text"
        style="font-family: {{ terminalFont }};"
        @keydown.enter.prevent="submit"
        @keydown.up.prevent="onUpArrow"
        @keydown.down.prevent="onDownArrow"
        v-model="inputValue"
        class="terminal_input terminal"
        autocomplete="off"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, inject, onMounted } from "vue";
/* eslint-disable no-unused-vars */
type PromptResolver = (response: string) => void;

const fonts: { [key: string]: string } = {
  spacemono: "SpaceMono",
  monospace: "monospace",
  jetbrains: "JetBrains Mono",
  fira: "Fira Mono",
  cascadia: "Cascadia Mono",
  cascadiapl: "Cascadia Mono PL",
};

class TerminalHistory {
  private history: string[] = [];
  private index: number = 0;
  private temp: string = "";
  public getCurrentIndex(): number {
    return this.index;
  }
  public getCurrentLength(): number {
    return this.history.length;
  }
  public setTemp(v: string) {
    this.temp = v;
  }
  public getHistory(dir: number): string {
    const idx = (this.index -= dir);
    if (idx > this.history.length - 1) {
      this.index = this.history.length;
      const v = this.temp;
      return v;
    } else if (idx < 0) {
      this.index = 0;
    } else {
      this.index = idx;
    }
    return this.history[this.index];
  }
  public addHistory(item: string) {
    this.index = this.history.push(item);
  }
}

const TerminalHelpFile = [
  " ",
  "Xeon Terminal Interface Helpfile",
  "-------------",
  " ",
  "/auth <username?> - Authenticate with the server. Optional username. If missing, it will prompt for username.",
  "/register <username?> - Register an account with the server. Optional username. If missing, it will prompt for username.",
  " ",
].join("\n");

export default defineComponent({
  setup() {
    const websocket_uri = inject("websocket_uri") as string;
    let prompt = ref<string>("> ");
    let output = ref<string>("");
    let socket: WebSocket;
    let inputValue = ref<string>();
    let terminalFont = ref<string>("monospace");
    let promptResolver: PromptResolver | null = null;
    const inputRef = ref<HTMLInputElement>();
    let history = ref<TerminalHistory>(new TerminalHistory());

    function ensureClose(): boolean {
      return socket.readyState != WebSocket.OPEN;
    }
    function send(message: string | Uint8Array) {
      if (ensureClose()) return;
      socket.send(message);
    }
    function sendEvent(event: string, data: { [key: string]: any }) {
      data.event = event.toUpperCase();
      send(JSON.stringify(data));
    }

    function scrollDown() {
      inputRef.value?.scrollIntoView({ behavior: "smooth" });
    }

    function focusInput() {
      inputRef.value?.focus();
    }

    function setPasswordState(state: boolean = true) {
      inputRef.value?.setAttribute("type", state ? "password" : "text");
    }

    function getPasswordState(): boolean {
      return inputRef.value?.getAttribute("type") == "password";
    }

    async function ask(
      promptText: string,
      password: boolean = false
    ): Promise<string> {
      let tempPrompt = prompt.value;
      prompt.value = promptText;
      setPasswordState(password);
      return await new Promise((resolve) => {
        promptResolver = (res: string) => {
          prompt.value = tempPrompt;
          setPasswordState(false);
          promptResolver = null;
          resolve(res);
        };
      });
    }

    function onUpArrow() {
      if (history.value.getCurrentIndex() == history.value.getCurrentLength())
        history.value.setTemp(inputValue.value || "");
      inputValue.value = history.value.getHistory(1);
    }

    function onDownArrow() {
      inputValue.value = history.value.getHistory(-1);
    }

    function submit() {
      const inptxt = inputValue.value || "";
      if (inptxt.trim().length == 0) return;
      inputValue.value = "";
      if (promptResolver != null) {
        promptResolver(inptxt);
      } else {
        if (!getPasswordState()) {
          log(`${prompt.value}${inptxt}`);
          history.value.addHistory(inptxt);
        }
        if (inptxt[0] == "/") {
          // command
          const cmd: string[] = inptxt.substring(1).split(" ");
          switch (cmd[0]) {
            case "font":
              if (cmd[1] != undefined && fonts[cmd[1]] != undefined) {
                terminalFont.value = fonts[cmd[1]];
                log("Font family changed to:", terminalFont.value);
              } else {
                log(
                  `\nAvailable Fonts:\n\n${Object.keys(fonts)
                    .map((k) => `${k} => ${fonts[k]}`)
                    .join("\n")}\n`
                );
              }
              break;
            case "auth":
              if (ensureClose()) {
                log("No connection available.");
                break;
              }
              ask("Username: ").then((username: string) => {
                ask("Password: ", true).then((password: string) => {
                  sendEvent("authenticate", {
                    username,
                    password,
                  });
                });
              });
              if (cmd[1] != undefined && cmd[1].trim().length > 0)
                ((promptResolver as unknown) as (val: string) => void)(
                  cmd[1].trim()
                );
              break;
            case "register":
              if (ensureClose()) {
                log("No connection available.");
                break;
              }
              ask("Username: ").then((username: string) => {
                ask("Password: ", true).then((p1: string) => {
                  ask("Re-Enter Password: ", true).then((p2: string) => {
                    if (p1 == p2)
                      sendEvent("register", {
                        username,
                        password: p1,
                      });
                    else log("Registration Error: Passwords did not match.");
                  });
                });
              });
              if (cmd[1] != undefined && cmd[1].trim().length > 0)
                ((promptResolver as unknown) as PromptResolver)(cmd[1].trim());
              break;
            case "help":
              log(TerminalHelpFile);
              break;
            default:
              log(`Unknown command: '${cmd[0]}'`);
              break;
          }
        } else {
          sendEvent("line", { data: inptxt });
        }
      }
    }

    function log(...args: any[]) {
      function stringify(val: any): string {
        if (val == undefined) return "";
        if (typeof val == "object") {
          return JSON.stringify(val);
        } else {
          return val.toString();
        }
      }
      const v = args.map((v) => stringify(v)).join(" ");
      if (v.length == 0) return;
      output.value = `${output.value}${v}\n`;
      scrollDown();
    }

    function handleMessage(data: string | Uint8Array) {
      if (typeof data == "string") {
        log(data);
      } else {
        //
      }
    }

    function handleOpen() {
      log("Connected.");
    }

    function handleError(err: Error) {
      log("Error occurred in websocket:", err);
    }

    function handleClose(code: number, reason: string) {
      log("Disconnected. Code", code, "Reason:", reason);
    }

    onMounted(() => {
      socket = new WebSocket(websocket_uri);
      socket.addEventListener(
        "message",
        (ev: MessageEvent<string | Uint8Array>) => {
          handleMessage(ev.data);
        }
      );
      socket.addEventListener("error", () => {
        handleError(new Error("A WebSocket Error Occurred."));
      });
      socket.addEventListener("open", () => {
        handleOpen();
      });
      socket.addEventListener("close", (ev) => {
        handleClose(ev.code, ev.reason);
      });
      focusInput();
    });

    return {
      prompt,
      output,
      inputValue,
      promptResolver: promptResolver as PromptResolver | null,
      inputRef,
      scrollDown,
      focusInput,
      ask,
      setPasswordState,
      getPasswordState,
      submit,
      log,
      handleMessage,
      handleClose,
      handleError,
      handleOpen,
      onUpArrow,
      onDownArrow,
      terminalFont,
    };
  },
});
</script>

<style scoped>
@font-face {
  font-family: SpaceMono;
  src: url("../assets/fonts/SpaceMono/SpaceMono-Regular.ttf");
}
@font-face {
  font-family: "Cascadia Mono";
  src: url("../assets/fonts/Cascadia Mono/CascadiaMono.ttf");
}
@font-face {
  font-family: "Cascadia Mono PL";
  src: url("../assets/fonts/Cascadia Mono/CascadiaMonoPL.ttf");
}
@font-face {
  font-family: "Fira Mono";
  src: url("../assets/fonts/Fira Mono/FiraMono-Regular.ttf");
}
@font-face {
  font-family: "JetBrains Mono";
  src: url("../assets/fonts/JetBrains Mono/JetBrainsMono-VariableFont_wght.ttf");
}
#terminal {
  overflow-x: hidden;
  overflow-y: auto;
  word-wrap: break-word;
  width: 100%;
  height: 100%;
}
.terminal {
  font-family: monospace;
  font-size: 1em;
  white-space: pre;
  display: flex;
  flex-flow: column;
  text-align: left;
  background-color: rgb(41, 48, 56);
  word-wrap: break-word;
  color: white;
}
.terminal_input_line {
  flex-flow: row;
  align-content: flex-start;
  align-items: center;
  width: 98vw;
}
.terminal_input_prompt {
  flex-grow: 1;
}
.terminal_input {
  border: 0px;
  outline: 1px;
  margin: 0px;
  padding: 0px;
  flex-grow: 1;
  width: 99%;
}
.terminal_input:focus {
  outline: 0px;
}
</style>