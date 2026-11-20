import { balancedGrowth, quote, validateParams } from "./feeCurve";
import { START_AMOUNT0, START_AMOUNT1, positionAmounts, weight0 } from "./inventory";
import { sqrtPriceAtTick } from "./tickMath";

function expectEqual(label: string, actual: bigint | number | string | undefined, expected: bigint | number | string | undefined) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

const weight = weight0(START_AMOUNT0, START_AMOUNT1);
expectEqual("dashboard weight", weight, 521n * 10n ** 15n);
expectEqual("worsening fee", quote(weight, true), 3500);
expectEqual("repairing fee", quote(weight, false), 2500);

expectEqual("sqrt price at 0", sqrtPriceAtTick(0), 2n ** 96n);
expectEqual("sqrt price at 1", sqrtPriceAtTick(1), 79232123823359799118286999568n);
expectEqual("sqrt price at 600", sqrtPriceAtTick(600), 81640896826356156310682304526n);
expectEqual("sqrt price at minus 600", sqrtPriceAtTick(-600), 76886731765546235930195592750n);
expectEqual("sqrt price at min tick", sqrtPriceAtTick(-887272), 4295128739n);
expectEqual("sqrt price at max tick", sqrtPriceAtTick(887272), 1461446703485210103287273052203988822378723970342n);

const price120 = sqrtPriceAtTick(120);
expectEqual("sqrt price at 120", price120, 79704936542881920863903188246n);
const held = positionAmounts(10n ** 18n, price120, sqrtPriceAtTick(-600), sqrtPriceAtTick(600));
expectEqual("amount0 at 120", held.amount0, 23571273118627507n);
expectEqual("amount1 at 120", held.amount1, 35570745147955334n);
expectEqual("weight at 120", weight0(held.amount0, held.amount1, price120), 401433580384594931n);

expectEqual("balanced growth is valid", validateParams(balancedGrowth), undefined);
expectEqual("inverted bounds", validateParams({ ...balancedGrowth, minFee: 4000 }), "Min fee must not exceed the base fee.");

console.log("fee curve check ok");
