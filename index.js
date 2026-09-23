// Neutral local boot loader (offline build)
window.screenOrientation = "sensor_portrait";

function loadLib(url) {
    var script = document.createElement("script");
    script.async = false;
    script.src = url;
    document.body.appendChild(script);
}

loadLib("libs/laya.core.js");
loadLib("libs/laya.ani.js");
loadLib("libs/laya.ui.js");
loadLib("libs/laya.d3.js");
loadLib("libs/laya.physics3D.js");
loadLib("myself/SpineAnimation.js");
loadLib("myself/Logger.js");
loadLib("myself/RandomUtils.js");
loadLib("myself/ArrayUtils.js");
loadLib("js/bundle.js");
