namespace UI {
    //let divUI: HTMLDivElement = <HTMLDivElement>document.getElementById("UI");
    let player1UI: HTMLDivElement = <HTMLDivElement>document.getElementById("Player1");
    let player2UI: HTMLDivElement = <HTMLDivElement>document.getElementById("Player2");

    export function updateUI() {
        //Player1 UI
        (<HTMLDivElement>player1UI.querySelector("#HP")).style.width = (Game.player.hero.attributes.healthPoints / Game.player.hero.attributes.maxhealthPoints * 100) + "%";

        //TODO: Needs testing
        //InventoryUI
        Game.player.items.forEach((element) => {
            let exsist: boolean = false;
            
            //search DOMImg for Item
            player1UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                if (imgElement.src == element.imgSrc) {
                    exsist = true;
                }
            });

            //none exsisting DOMImg for Item
            if (!exsist) {
                let newItem: HTMLImageElement = document.createElement("img");
                newItem.src = element.imgSrc;
                player1UI.querySelector("#Inventory").appendChild(newItem);
            }
        });

        //Player2 UI
        if (Game.connected) {
            (<HTMLDivElement>player2UI.querySelector("#HP")).style.width = (Game.player2.hero.attributes.healthPoints / Game.player2.hero.attributes.maxhealthPoints * 100) + "%";

            //InventoryUI
            Game.player2.items.forEach((element) => {
                let exsist: boolean = false;
                
                //search DOMImg for Item
                player2UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                    if (imgElement.src == element.imgSrc) {
                        exsist = true;
                    }
                });
                
                //none exsisting DOMImg for Item
                if (!exsist) {
                    let newItem: HTMLImageElement = document.createElement("img");
                    newItem.src = element.imgSrc;
                    player2UI.querySelector("#Inventory").appendChild(newItem);
                }
            });
        }
    }
}