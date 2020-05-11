import Point from "../classes/Point";
import { getCurrentTimeMs } from "../utils";
import ConfigService from "./ConfigService";

class ThrottlingService {
    /**
     * @type {number}
     * @private
     */
    _lastSuccessTime = 0;

    /**
     * @type {Point}
     * @private
     */
    _lastPointPosition = new Point(0, 0);

    /**
     * Helper to throttle events based on the configuration.
     * Only if checks are ok, the onSuccess callback will be called.
     *
     * @param {Point} newPosition New point position to base the throttling on
     * @param {function()} onSuccess Callback called when the throttling is successful
     */
    throttle(newPosition, onSuccess) {
        const newTime = getCurrentTimeMs();
        const { _lastPointPosition, _lastSuccessTime } = this;
        if (newTime - _lastSuccessTime > ConfigService.pointerEventsThrottling.minTimeDelta) {
            if (
                _lastPointPosition.distTo(newPosition) >
                ConfigService.pointerEventsThrottling.minDistDelta
            ) {
                onSuccess();
                this._lastPointPosition = newPosition;
                this._lastSuccessTime = newTime;
            }
        }
    }
}

export default new ThrottlingService();
