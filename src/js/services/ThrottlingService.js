import Point from "../classes/Point.js";
import { getCurrentTimeMs } from "../utils.js";
import ConfigService from "./ConfigService.js";

/**
 * Class to handle all the throttling logic
 */
class ThrottlingService {
    /**
     * @type {number}
     */
    #lastSuccessTime = 0;
    get lastSuccessTime() {
        return this.#lastSuccessTime;
    }

    /**
     * @type {Point}
     */
    #lastPointPosition = new Point(0, 0);
    get lastPointPosition() {
        return this.#lastPointPosition;
    }

    /**
     * Helper to throttle events based on the configuration.
     * Only if checks are ok, the onSuccess callback will be called.
     *
     * @param {Point} newPosition New point position to base the throttling on
     * @param {function()} onSuccess Callback called when the throttling is successful
     */
    throttle(newPosition, onSuccess) {
        const newTime = getCurrentTimeMs();
        const { lastPointPosition, lastSuccessTime } = this;
        if (newTime - lastSuccessTime > ConfigService.pointerEventsThrottling.minTimeDelta) {
            if (
                lastPointPosition.distTo(newPosition) >
                ConfigService.pointerEventsThrottling.minDistDelta
            ) {
                onSuccess();
                this.#lastPointPosition = newPosition;
                this.#lastSuccessTime = newTime;
            }
        }
    }
}

export default new ThrottlingService();
