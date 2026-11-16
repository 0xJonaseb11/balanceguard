import { quote } from "./feeCurve";
import { START_AMOUNT0, START_AMOUNT1, weight0 } from "./inventory";

const weight = weight0(START_AMOUNT0, START_AMOUNT1);
if (weight !== 521n * 10n ** 15n) {
  throw new Error(`weight ${weight}`);
}
if (quote(weight, true) !== 3500) {
  throw new Error(`worsening fee ${quote(weight, true)}`);
}
if (quote(weight, false) !== 2500) {
  throw new Error(`repairing fee ${quote(weight, false)}`);
}
console.log("fee curve check ok");
