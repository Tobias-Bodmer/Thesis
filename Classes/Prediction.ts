namespace Networking {
    export abstract class Prediction {
        protected timer: number = 0;
        protected currentTick: number = 0;
        public minTimeBetweenTicks: number;
        protected gameTickRate: number = 62.5;
        protected bufferSize: number = 1024;
        protected ownerNetId: number; get owner(): Entity.Entity { return Game.entities.find(elem => elem.netId == this.ownerNetId) };

        protected stateBuffer: Interfaces.StatePayload[];

        constructor(_ownerNetId: number) {
            this.minTimeBetweenTicks = 1 / this.gameTickRate;
            this.stateBuffer = new Array<Interfaces.StatePayload>(this.bufferSize);
            this.ownerNetId = _ownerNetId;
        }

        protected handleTick() {
        }

        protected processMovement(input: Interfaces.InputPayload): Interfaces.StatePayload {
            //TODO: implement whole movement calculation inclusive collision
            //do movement 
            let cloneInputVector = input.inputVector.clone;
            if (cloneInputVector.magnitude > 0) {
                cloneInputVector.normalize();
            }

            if (Networking.client.id == Networking.client.idHost && input.doesAbility) {
                (<Player.Player>this.owner).doAbility();
            }

            (<Player.Player>this.owner).move(cloneInputVector);


            let newStatePayload: Interfaces.StatePayload = { tick: input.tick, position: this.owner.mtxLocal.translation, doesAbility: input.doesAbility }
            return newStatePayload;
        }
    }

    export class ClientPrediction extends Prediction {

        private inputBuffer: Interfaces.InputPayload[];
        private latestServerState: Interfaces.StatePayload;
        private lastProcessedState: Interfaces.StatePayload;
        private horizontalInput: number;
        private verticalInput: number;
        protected doesAbility: boolean;

        private AsyncTolerance: number = 0.1;


        constructor(_ownerNetId: number) {
            super(_ownerNetId);
            this.inputBuffer = new Array<Interfaces.InputPayload>(this.bufferSize);
        }


        public update() {
            this.horizontalInput = InputSystem.move().x;
            this.verticalInput = InputSystem.move().y;
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }

        protected handleTick() {

            if (this.latestServerState != this.lastProcessedState) {
                this.handleServerReconciliation();
            }
            let bufferIndex = this.currentTick % this.bufferSize;
            this.switchAvatarAbilityState();
            let inputPayload: Interfaces.InputPayload = { tick: this.currentTick, inputVector: new ƒ.Vector3(this.horizontalInput, this.verticalInput, 0), doesAbility: this.doesAbility };
            this.inputBuffer[bufferIndex] = inputPayload;
            // console.log(inputPayload.tick + "___" + inputPayload.inputVector.clone);
            this.stateBuffer[bufferIndex] = this.processMovement(inputPayload);

            //send inputPayload to host
            Networking.sendClientInput(this.ownerNetId, inputPayload);
        }

        switchAvatarAbilityState() {
            if (this.owner.id == Entity.ID.RANGED) {
                this.doesAbility = (<Player.Ranged>this.owner).dash.doesAbility;
            }
            else {
                this.doesAbility = (<Player.Melee>this.owner).block.doesAbility;
            }
        }


        public onServerMovementState(_serverState: Interfaces.StatePayload) {
            this.latestServerState = _serverState;
        }

        private handleServerReconciliation() {
            this.lastProcessedState = this.latestServerState;

            let serverStateBufferIndex = this.latestServerState.tick % this.bufferSize;
            let positionError: number = Game.ƒ.Vector3.DIFFERENCE(this.latestServerState.position, this.stateBuffer[serverStateBufferIndex].position).magnitude;
            if (positionError > this.AsyncTolerance) {
                console.warn("you need to be updated to: X:" + this.latestServerState.position.x + " Y: " + this.latestServerState.position.y);
                this.owner.mtxLocal.translation = this.latestServerState.position;

                this.stateBuffer[serverStateBufferIndex] = this.latestServerState;

                let tickToProcess = (this.latestServerState.tick + 1);

                while (tickToProcess < this.currentTick) {
                    let statePayload: Interfaces.StatePayload = this.processMovement(this.inputBuffer[tickToProcess % this.bufferSize]);

                    let bufferIndex = tickToProcess % this.bufferSize;
                    this.stateBuffer[bufferIndex] = statePayload;

                    tickToProcess++;
                }
            }
        }
    }

    export class ServerPrediction extends Prediction {

        private inputQueue: Queue = new Queue();

        constructor(_ownerNetId: number) {
            super(_ownerNetId);
        }

        public updateEntityToCheck(_netId: number) {
            this.ownerNetId = _netId;
        }

        public update() {
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }

        handleTick() {

            let bufferIndex = -1;
            while (this.inputQueue.getQueueLength() > 0) {
                let inputPayload: Interfaces.InputPayload = this.inputQueue.dequeue();

                bufferIndex = inputPayload.tick % this.bufferSize;
                let statePayload: Interfaces.StatePayload = this.processMovement(inputPayload)
                this.stateBuffer[bufferIndex] = statePayload;
            }

            if (bufferIndex != -1) {
                //Send to client new position
                Networking.sendServerBuffer(this.ownerNetId, this.stateBuffer[bufferIndex]);
            }
        }

        public onClientInput(inputPayload: Interfaces.InputPayload) {
            this.inputQueue.enqueue(inputPayload);
        }
    }



    class Queue {
        private items: Interfaces.InputPayload[];

        constructor() {
            this.items = [];
        }

        enqueue(_item: Interfaces.InputPayload) {
            this.items.push(_item);
        }

        dequeue() {
            return this.items.shift();
        }

        getQueueLength() {
            return this.items.length;
        }

        getItems() {
            return this.items;
        }
    }

}