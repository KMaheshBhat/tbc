import { afterAll, describe } from "bun:test";

import { generateFileTree } from "../../../scripts/common";

import { TBC_ROOT } from "./test-helper";

describe("🐵 TBC-CLI Integration", () => {

    afterAll(() => {
        console.log("🐵 Mojo Jojo!")
        console.log(generateFileTree(TBC_ROOT));
        console.log("🐵 Suite Complete");
    });

});