<template>
  <div
    id="terminal_container"
    class="terminal-container"
    @click="focusTerminal"
  >
    <Terminal ref="terminal" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, Ref } from "vue";
import Terminal from "./components/Terminal.vue";

export default defineComponent({
  setup() {
    const terminal = ref(null);

    return {
      terminal: (terminal as unknown) as Ref<typeof Terminal>,
    };
  },
  components: {
    Terminal,
  },
  methods: {
    focusTerminal() {
      this.terminal.focusInput();
    },
  },
});
</script>

<style>
body,
html {
  background-color: rgb(41, 48, 56);
  width: 99vw;
  margin: 0px;
  padding: 5px;
  height: 98vh;
}
.terminal-container {
  width: 100%;
  height: 100%;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 0px;
  display: flex;
  flex-flow: column;
  background-color: rgb(41, 48, 56);
  width: 100%;
  height: 100%;
}
</style>
