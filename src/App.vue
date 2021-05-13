<template>
  <div id="terminal_container" class="terminal-container" @click="focusTerminal">
    <Terminal ref="terminal" promptText="> "/>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import Terminal from "./components/Terminal.vue";

@Options({
  components: {
    Terminal,
  },
  methods: {
    focusTerminal() {
      this.$refs.terminal.focusInput();
    }
  }
})
export default class App extends Vue {}
</script>

<style>
body, html {
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
