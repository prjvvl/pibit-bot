import dotenv from 'dotenv';
import { verifyEnvVariables } from './services/utils.js';
import { SlackPlatform } from './platform/slack.js';
dotenv.config();


const init = async () => {
    verifyEnvVariables();
    const slack = new SlackPlatform();
    slack.listen();
    // slack.sendMessage('C09BKJNGA3H', 'Hello World!');
}

init();
