import { extractCode } from "./pdf/interpreter";
import { generatePass } from "./wallet";
import express from "express";
import axios from "axios";
import { constants } from "@walletpass/pass-js";
import cors from "cors";

const app = express();

// app.use(cors());

app.use(express.json());

app.post("/pass", async (req, res) => {
    try {
        const serverResponse = await axios.get(req.body.url, {
            responseType: 'arraybuffer'
        });
        const buffer = Buffer.from(serverResponse.data, 'binary');
        const code = await extractCode(buffer);
        const pass = await generatePass({originalLink: req.body.url, ...code});
        res.type(constants.PASS_MIME_TYPE);
        res.send(pass);
    } catch (e) {
        console.error(e);
        res.status(500);
        res.send(e);
    }
});

app.listen(8080, () => {
    console.log(`Example app listening at http://localhost:${8080}`)
})
