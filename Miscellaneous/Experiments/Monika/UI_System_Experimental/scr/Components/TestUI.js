/// <reference path="../../../../../../Core/Build/Fudge.d.ts"/>
/// <reference path="../UI/MutableUI.ts"/>
var UI;
(function (UI) {
    class TestUI extends UI.MutableUI {
        constructor(container, state, _camera) {
            super(_camera);
            this.camera = _camera;
            this.root = document.createElement("form");
            let testdiv = document.createElement("div");
            testdiv.innerHTML = "I was created manually";
            this.root.append(testdiv);
            UI.UIGenerator.createFromMutable(_camera, this.root);
            this.root.addEventListener("input", this.mutateOnInput);
            container.getElement().html(this.root);
        }
    }
    UI.TestUI = TestUI;
})(UI || (UI = {}));
//# sourceMappingURL=TestUI.js.map