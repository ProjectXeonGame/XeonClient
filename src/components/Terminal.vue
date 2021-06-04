<template>
  <div id="terminal" class="terminal">
    <div
      ref="terminalOutputRef"
      class="terminal_output"
      :style="'font-family: ' + terminalFont + ';'"
      v-for="(ansiobjs, blockid) in output"
      :key="blockid"
    >
      <span
        v-for="(ansi, i) in ansiobjs"
        :key="i"
        :class="ansi.classes.join(' ')"
        v-text="ansi.text"
      ></span>
    </div>
    <div class="terminal_input_line terminal">
      <div
        class="terminal_input_prompt"
        :style="'font-family: ' + terminalFont + ';'"
      >
        <span
          v-for="(ansi, i) in toAnsiObjects(prompt)"
          :key="i"
          :class="ansi.classes.join(' ')"
          v-text="ansi.text"
        ></span>
      </div>
      <input
        ref="inputRef"
        type="text"
        :style="'font-family: ' + terminalFont + ';'"
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
/* eslint-disable no-control-regex */
type PromptResolver = (response: string) => void;

export const colorMap: { [key: string]: string } = {
  "0;30": "ansi-black",
  "0;31": "ansi-red",
  "0;32": "ansi-green",
  "0;33": "ansi-yellow",
  "0;34": "ansi-blue",
  "0;35": "ansi-magenta",
  "0;36": "ansi-cyan",
  "0;37": "ansi-white",
  "1;30": "ansi-bold-black",
  "1;31": "ansi-bold-red",
  "1;32": "ansi-bold-green",
  "1;33": "ansi-bold-yellow",
  "1;34": "ansi-bold-blue",
  "1;35": "ansi-bold-magenta",
  "1;36": "ansi-bold-cyan",
  "1;37": "ansi-bold-white",
  "4;30": "ansi-ul-black",
  "4;31": "ansi-ul-red",
  "4;32": "ansi-ul-green",
  "4;33": "ansi-ul-yellow",
  "4;34": "ansi-ul-blue",
  "4;35": "ansi-ul-magenta",
  "4;36": "ansi-ul-cyan",
  "4;37": "ansi-ul-white",
  "40": "ansi-bg-black",
  "41": "ansi-bg-red",
  "42": "ansi-bg-green",
  "43": "ansi-bg-yellow",
  "44": "ansi-bg-blue",
  "45": "ansi-bg-magenta",
  "46": "ansi-bg-cyan",
  "47": "ansi-bg-white",
  "0": "0",
};

export const defaultPalette: { [key: string]: string } = {
  "ansi-black": "black",
  "ansi-red": "red",
  "ansi-green": "green",
  "ansi-yellow": "yellow",
  "ansi-blue": "blue",
  "ansi-magenta": "magenta",
  "ansi-cyan": "cyan",
  "ansi-white": "white",
  "ansi-bold-black": "grey",
  "ansi-bold-red": "red",
  "ansi-bold-green": "lime",
  "ansi-bold-yellow": "yellow",
  "ansi-bold-blue": "blue",
  "ansi-bold-magenta": "magenta",
  "ansi-bold-cyan": "cyan",
  "ansi-bold-white": "white",
  "ansi-bg-black": "black",
  "ansi-bg-red": "red",
  "ansi-bg-green": "green",
  "ansi-bg-yellow": "yellow",
  "ansi-bg-blue": "blue",
  "ansi-bg-magenta": "magenta",
  "ansi-bg-cyan": "cyan",
  "ansi-bg-white": "white",
  "ansi-ul-black": "black",
  "ansi-ul-red": "red",
  "ansi-ul-green": "green",
  "ansi-ul-yellow": "yellow",
  "ansi-ul-blue": "blue",
  "ansi-ul-magenta": "magenta",
  "ansi-ul-cyan": "cyan",
  "ansi-ul-white": "white",
};

export interface AnsiObject {
  classes: string[];
  text: string;
}

export function toAnsiObjects(ansi: string): AnsiObject[] {
  const regHasANSI = /\x1b\[(?:(?:[014];3[0-7])|4[0-7]|0)m/;
  const reg = /\x1b\[(?:(?:[014];3[0-7])|4[0-7]|0)m/g;
  const regParse = /\x1b\[((?:(?:[014];3[0-7])|4[0-7]|0))m/;
  const tokens: string[] = [];
  let match = reg.exec(ansi);
  if (match == null) return [{ classes: [], text: ansi }];
  let index = 0;
  while (match != null) {
    const idx = match.index;
    if (idx > index) {
      tokens.push(ansi.substring(index, idx));
    }
    const token = match[0];
    const len = token.length;
    index = idx + len;
    tokens.push(token);
    match = reg.exec(ansi);
  }
  if (index != ansi.length - 1) {
    tokens.push(ansi.substring(index));
  }
  let hasOpenSpan = false;
  let currentSpanClasses: [string, string] = ["", ""]; // [FG, BG]
  let tempText: string[] = [];
  const res: AnsiObject[] = [];
  function closeTag() {
    if (hasOpenSpan) {
      res.push({
        classes: currentSpanClasses.slice().filter((v) => v != ""),
        text: tempText.join(" "),
      });
      tempText = [];
      currentSpanClasses = ["", ""];
    } else if (tempText.length > 0) {
      res.push({
        classes: [],
        text: tempText.join(" "),
      });
    }
  }
  function isForegroundColor(d: string): boolean {
    return d.startsWith("0;3") || d.startsWith("1;3") || d.startsWith("4;3");
  }
  tokens.forEach((token, i) => {
    if (!regHasANSI.test(token)) {
      tempText.push(token);
      if (i == tokens.length - 1) {
        // last item
        closeTag();
        return;
      }
    } else {
      const m = regParse.exec(token);
      if (m == null) return;
      const clv = m[1];
      const mapped = colorMap[clv];

      if (hasOpenSpan) {
        if (isForegroundColor(clv)) {
          // foreground color
          if (currentSpanClasses[0] != "") {
            closeTag();
          }
          currentSpanClasses[0] = mapped;
        } else if (clv.startsWith("4")) {
          // background color
          if (currentSpanClasses[1] != "") {
            closeTag();
          }
          currentSpanClasses[1] = mapped;
        } else if (clv == "0") {
          // reset
          closeTag();
          hasOpenSpan = false;
        } else {
          console.log("Unhandled color:", mapped, clv);
          throw new Error();
        }
      } else {
        if (tempText.length > 0) {
          res.push({ classes: [], text: tempText.join(" ") });
          tempText = [];
        }
        hasOpenSpan = true;
        if (isForegroundColor(clv)) {
          // foreground color
          currentSpanClasses[0] = mapped;
        } else if (clv.startsWith("4")) {
          // background color
          currentSpanClasses[1] = mapped;
        }
      }
      if (i == tokens.length - 1) {
        // last item
        closeTag();
      }
    }
  });
  return res;
}

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
    let prompt = ref<string>("$ ");
    let output = ref<AnsiObject[][]>([]);
    let socket: WebSocket;
    let inputValue = ref<string>();
    let terminalOutputRef = ref<HTMLDivElement>();
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
            case "colors": {
              let res = "";
              for (let i1 = 0; i1 < 8; i1++) {
                res += `\x1b[0;3${i1}mText`;
              }
              log(res);
              res = "";
              for (let i1 = 0; i1 < 8; i1++) {
                res += `\x1b[1;3${i1}mText`;
              }
              log(res);
              res = "";
              for (let i1 = 0; i1 < 8; i1++) {
                res += `\x1b[4;3${i1}mText`;
              }
              log(res);
              res = "";
              for (let i1 = 0; i1 < 8; i1++) {
                res += `\x1b[4${i1}mText`;
              }
              log(res);
              break;
            }
            case "clear":
              output.value = [];
              break;
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
      output.value.push(toAnsiObjects(v));
      scrollDown();
    }

    function handleMessage(data: string | Uint8Array) {
      function parseEvent(
        d: string
      ): { [key: string]: any; event: string } | null {
        try {
          const obj = JSON.parse(d);
          if (obj.event == undefined || typeof obj.event != "string")
            return null;
          return obj;
        } catch (e) {
          return null;
        }
      }
      if (typeof data == "string") {
        const obj = parseEvent(data);
        if (obj === null) log(data);
        else {
          switch (obj.event) {
            case "cwd":
              prompt.value = `\x1b[0;32muser@localhost\x1b[0m:\x1b[0;34m${obj.cwd}\x1b[0m$ `;
              break;
          }
        }
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
      toAnsiObjects,
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
      terminalOutputRef,
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
.terminal_output {
  flex-flow: row;
  white-space: pre;
}
.terminal {
  font-family: monospace;
  font-size: 11pt;
  white-space: pre;
  display: flex;
  flex-flow: column;
  text-align: left;
  background-color: rgb(14, 15, 15);
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
.ansi-black {
  color: black;
}
.ansi-red {
  color: red;
}
.ansi-green {
  color: rgb(93, 202, 93);
}
.ansi-yellow {
  color: yellow;
}
.ansi-blue {
  color: rgb(140, 140, 230);
}
.ansi-magenta {
  color: magenta;
}
.ansi-cyan {
  color: cyan;
}
.ansi-white {
  color: white;
}
.ansi-bold-black {
  font-weight: bold;
  color: grey;
}
.ansi-bold-red {
  font-weight: bold;
  color: red;
}
.ansi-bold-green {
  font-weight: bold;
  color: lime;
}
.ansi-bold-yellow {
  font-weight: bold;
  color: yellow;
}
.ansi-bold-blue {
  font-weight: bold;
  color: blue;
}
.ansi-bold-magenta {
  font-weight: bold;
  color: magenta;
}
.ansi-bold-cyan {
  font-weight: bold;
  color: cyan;
}
.ansi-bold-white {
  font-weight: bold;
  color: white;
}
.ansi-bg-black {
  background-color: black;
}
.ansi-bg-red {
  background-color: red;
}
.ansi-bg-green {
  background-color: rgb(93, 202, 93);
}
.ansi-bg-yellow {
  background-color: yellow;
}
.ansi-bg-blue {
  background-color: rgb(140, 140, 230);
}
.ansi-bg-magenta {
  background-color: magenta;
}
.ansi-bg-cyan {
  background-color: cyan;
}
.ansi-bg-white {
  background-color: white;
}
.ansi-ul-black {
  text-decoration: underline;
  text-decoration-color: black;
  color: black;
}
.ansi-ul-red {
  text-decoration: underline;
  text-decoration-color: red;
  color: red;
}
.ansi-ul-green {
  text-decoration: underline;
  text-decoration-color: rgb(93, 202, 93);
  color: rgb(93, 202, 93);
}
.ansi-ul-yellow {
  text-decoration: underline;
  text-decoration-color: yellow;
  color: yellow;
}
.ansi-ul-blue {
  text-decoration: underline;
  text-decoration-color: rgb(140, 140, 230);
  color: rgb(140, 140, 230);
}
.ansi-ul-magenta {
  text-decoration: underline;
  text-decoration-color: magenta;
  color: magenta;
}
.ansi-ul-cyan {
  text-decoration: underline;
  text-decoration-color: cyan;
  color: cyan;
}
.ansi-ul-white {
  text-decoration: underline;
  text-decoration-color: white;
  color: white;
}
</style>