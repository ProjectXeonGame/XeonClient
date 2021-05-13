<template>
  <div id="terminal" class="terminal">
    <div class="terminal_output terminal">{{ output.join("\n") }}</div>
    <div class="terminal_input_line terminal">
      <div class="terminal_input_prompt terminal">{{ prompt }}</div>
      <input
        ref="inputRef"
        type="text"
        @keydown.enter="submit"
        v-model="inputValue"
        class="terminal_input terminal"
        autocomplete="off"
      />
    </div>
  </div>
  <Network
    ref="network"
    @message="handleMessage"
    @error="handleError"
    @open="handleOpen"
    @close="handleClose"
  />
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Network from "./Network.vue";

const TerminalHelpFile = [
  " ",
  "Xeon Terminal Interface Helpfile",
  "-------------",
  " ",
  "/auth <username?> - Authenticate with the server. Optional username. If missing, it will prompt for username.",
  "/register <username?> - Register an account with the server. Optional username. If missing, it will prompt for username.",
  " ",
].join("\n");

@Options({
  components: {
    Network,
  },
  data() {
    return {
      output: [],
      inputValue: "",
      prompt: this.promptText,
      promptResolver: null,
    };
  },
  mounted() {
    this.focusInput();
  },
  methods: {
    scrollDown() {
      this.$refs.inputRef.scrollIntoView({ behavior: "smooth" });
    },
    focusInput() {
      this.$refs.inputRef.focus();
    },
    setPasswordState(state: boolean = true) {
      this.$refs.inputRef.setAttribute("type", state ? "password" : "text");
    },
    getPasswordState(): boolean {
      return this.$refs.inputRef.getAttribute("type") == "password";
    },
    async ask(prompt: string, password: boolean = false): Promise<string> {
      let tempPrompt = this.prompt;
      this.prompt = prompt;
      this.setPasswordState(password);
      return await new Promise((resolve) => {
        this.promptResolver = (res: string) => {
          this.prompt = tempPrompt;
          this.setPasswordState(false);
          this.promptResolver = null;
          resolve(res);
        };
      });
    },
    submit() {
      const inptxt = this.inputValue;
      if (inptxt.trim().length == 0) return;
      this.inputValue = "";
      if (this.promptResolver != null) {
        this.promptResolver(inptxt);
      } else {
        if (!this.getPasswordState()) this.log(`${this.prompt}${inptxt}`);
        if (inptxt[0] == "/") {
          // command
          const cmd: string[] = inptxt.substring(1).split(" ");
          switch (cmd[0]) {
            case "auth":
              this.ask("Username: ").then((username: string) => {
                this.ask("Password: ", true).then((password: string) => {
                  this.$refs.network.sendEvent("authenticate", {
                    username,
                    password,
                  });
                });
              });
              if (cmd[1] != undefined && cmd[1].trim().length > 0)
                this.promptResolver(cmd[1].trim());
              break;
            case "register":
              this.ask("Username: ").then((username: string) => {
                this.ask("Password: ", true).then((p1: string) => {
                  this.ask("Re-Enter Password: ", true).then((p2: string) => {
                    if (p1 == p2)
                      this.$refs.network.sendEvent("register", {
                        username,
                        password: p1,
                      });
                    else
                      this.log("Registration Error: Passwords did not match.");
                  });
                });
              });
              if (cmd[1] != undefined && cmd[1].trim().length > 0)
                this.promptResolver(cmd[1].trim());
              break;
            case "help":
              this.log(TerminalHelpFile);
              break;
            default:
              this.log(`Unknown command: '${cmd[0]}'`);
              break;
          }
        } else {
          this.$refs.network.sendEvent("line", { data: inptxt });
        }
      }
    },
    log(...args: any[]) {
      function stringify(val: any): string {
        if (val == undefined) return "";
        if (typeof val == "object") {
          return JSON.stringify(val);
        } else {
          return val.toString();
        }
      }
      this.output.push(args.map((v) => stringify(v)).join(" "));
      this.scrollDown();
    },
    handleMessage(data: string | Uint8Array) {
      if (typeof data == "string") {
        this.log(data);
      } else {
        //
      }
    },
    handleError(err: Error) {
      this.log("Error occurred in websocket:", err);
    },
    handleOpen() {
      this.log("Connected.");
    },
    handleClose(code: number, reason: string) {
      this.log("Disconnected. Code", code, "Reason:", reason);
    },
  },
  props: {
    promptText: String,
  },
})
export default class Terminal extends Vue {
  promptText!: string;
}
</script>

<style scoped>
#terminal {
  overflow-x: hidden;
  overflow-y: auto;
  word-wrap: break-word;
  width: 100%;
  height: 100%;
}
.terminal {
  font-family: monospace;
  font-size: 12pt;
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