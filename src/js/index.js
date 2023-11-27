import "jquery-ui/ui/core.js";
import "jquery-ui/ui/widgets/draggable.js";
import "jquery-ui/ui/widgets/resizable.js";
import "jquery-ui-rotatable/jquery.ui.rotatable.js";
import "jquery-ui/themes/base/resizable.css";
import "../css/main.css";

import "./icons.js";
import main from "./main.js";

$(function () {
    $("head").append(
        '<meta name="viewport" content="width=device-width, initial-scale=0.52, maximum-scale=1" />'
    );

    main();
});
