import { createApp } from "vue";
import App from "./App.vue";

const app = createApp(App);

app.provide("websocket_uri", process.env.VUE_APP_WEBSOCKET_URI);

app.mount("#app");
