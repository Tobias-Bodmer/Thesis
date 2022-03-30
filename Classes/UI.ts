namespace UI {
    let divUI: HTMLDivElement = <HTMLDivElement>document.getElementById("UI");
    let player1UI: HTMLDivElement = <HTMLDivElement>document.getElementById("Player1");
    let player2UI: HTMLDivElement = <HTMLDivElement>document.getElementById("Player2");

    export function updateUI() {
        (<HTMLDivElement>player1UI.querySelector("#HP")).style.width = (Game.player.hero.attributes.healthPoints / Game.player.hero.attributes.maxhealthPoints * 100) + "%";

        //TODO: compare DOMElements with Items
        (<HTMLDivElement>player1UI.querySelector("#Inventory")).children;

        if (Game.connected) {
            (<HTMLDivElement>player2UI.querySelector("#HP")).style.width = (Game.player2.hero.attributes.healthPoints / Game.player2.hero.attributes.maxhealthPoints * 100) + "%";

            //TODO: compare DOMElements with Items
            (<HTMLDivElement>player1UI.querySelector("#Inventory")).children;
        }
    }
}