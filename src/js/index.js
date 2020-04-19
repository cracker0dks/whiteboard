import "jquery-ui/ui/core";
import "jquery-ui/ui/widgets/draggable";
import "@fortawesome/fontawesome-free/js/all";

import "../css/main.css";

import main from "./main";

$(document).ready(function () {

    // Set correct width height on mobile browsers
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    if (isChrome) {
        $('head').append('<meta name="viewport" content="width=device-width, initial-scale=0.52, maximum-scale=1" />');
    } else {
        $('head').append('<meta name="viewport" content="width=1400" />');
    }

    main();
});


if (module.hot) {
    module.hot.accept();
}
