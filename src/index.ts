import dotenv from "dotenv";
import { verifyEnvVariables } from "./services/utils.js";
import { SlackPlatform } from "./platform/slack.js";
dotenv.config();

verifyEnvVariables();
const slack = new SlackPlatform();
slack.registerEvents();

export default slack.getRequestHandler();
