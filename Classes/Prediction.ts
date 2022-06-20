namespace Networking {
    export abstract class Prediction {
        protected timer: number = 0;
        protected currentTick: number = 0;
        public minTimeBetweenTicks: number;
        protected gameTickRate: number = 62.5;
        protected bufferSize: number = 1024;
        protected ownerNetId: number; get owner(): Game.ƒ.Node { return Game.currentNetObj.find(elem => elem.netId == this.ownerNetId).netObjectNode };

        protected stateBuffer: Interfaces.IStatePayload[];

        constructor(_ownerNetId: number) {
            this.minTimeBetweenTicks = 1 / this.gameTickRate;
            this.stateBuffer = new Array<Interfaces.IStatePayload>(this.bufferSize);
            this.ownerNetId = _ownerNetId;
        }

        protected handleTick() {
        }

        protected processMovement(_input: Interfaces.IInputAvatarPayload | Interfaces.IInputBulletPayload): Interfaces.IStatePayload {
            return null;
        }


    }//#region  bullet Prediction
    abstract class BulletPrediction extends Prediction {
        protected processMovement(input: Interfaces.IInputBulletPayload): Interfaces.IStatePayload {
            let cloneInputVector = input.inputVector.clone;
            let bullet: Bullets.Bullet = <Bullets.Bullet>this.owner;
            bullet.move(cloneInputVector);

            let newStatePayload: Interfaces.IStatePayload = { tick: input.tick, position: bullet.mtxLocal.translation, rotation: bullet.mtxLocal.rotation }
            return newStatePayload;
        }
    }

    export class ServerBulletPrediction extends BulletPrediction {
        private inputQueue: Queue = new Queue();

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
                let inputPayload: Interfaces.IInputBulletPayload = <Interfaces.IInputBulletPayload>this.inputQueue.dequeue();

                bufferIndex = inputPayload.tick % this.bufferSize;
                let statePayload: Interfaces.IStatePayload = this.processMovement(inputPayload)
                this.stateBuffer[bufferIndex] = statePayload;
            }

            if (bufferIndex != -1) {
                //Send to client new position
                Networking.sendServerBuffer(this.ownerNetId, this.stateBuffer[bufferIndex]);
            }
        }

        public onClientInput(inputPayload: Interfaces.IInputBulletPayload) {
            this.inputQueue.enqueue(inputPayload);
        }
    }

    export class ClientBulletPrediction extends BulletPrediction {
        private inputBuffer: Interfaces.IInputBulletPayload[];
        private latestServerState: Interfaces.IStatePayload;
        private lastProcessedState: Interfaces.IStatePayload;
        private flyDirection: Game.ƒ.Vector3;

        private AsyncTolerance: number = 0.3;


        constructor(_ownerNetId: number) {
            super(_ownerNetId);
            this.inputBuffer = new Array<Interfaces.IInputBulletPayload>(this.bufferSize);
        }


        public update() {
            try {
                this.flyDirection = (<Bullets.Bullet>this.owner).flyDirection;
            } catch (error) {
                console.log("cant find owner");
            }
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
            let inputPayload: Interfaces.IInputBulletPayload = { tick: this.currentTick, inputVector: this.flyDirection, rotation: this.owner.mtxLocal.rotation };
            this.inputBuffer[bufferIndex] = inputPayload;
            this.stateBuffer[bufferIndex] = this.processMovement(inputPayload);

            //send inputPayload to host
            Networking.sendBulletInput(this.ownerNetId, inputPayload);
        }

        public onServerMovementState(_serverState: Interfaces.IStatePayload) {
            this.latestServerState = _serverState;
        }

        private handleServerReconciliation() {
            this.lastProcessedState = this.latestServerState;

            let serverStateBufferIndex = this.latestServerState.tick % this.bufferSize;
            let positionError: number = Game.ƒ.Vector3.DIFFERENCE(this.latestServerState.position, this.stateBuffer[serverStateBufferIndex].position).magnitude;
            if (positionError > this.AsyncTolerance) {
                console.warn(this.owner.name + " need to be updated to: X:" + this.latestServerState.position.x + " Y: " + this.latestServerState.position.y);
                this.owner.mtxLocal.translation = this.latestServerState.position;
                this.owner.mtxLocal.rotation = this.latestServerState.rotation;

                this.stateBuffer[serverStateBufferIndex] = this.latestServerState;

                let tickToProcess = (this.latestServerState.tick + 1);

                while (tickToProcess < this.currentTick) {
                    let statePayload: Interfaces.IStatePayload = this.processMovement(this.inputBuffer[tickToProcess % this.bufferSize]);

                    let bufferIndex = tickToProcess % this.bufferSize;
                    this.stateBuffer[bufferIndex] = statePayload;

                    tickToProcess++;
                }
            }
        }
    }
    //#endregion
    //#region  avatar Precdiction
    abstract class AvatarPrediction extends Prediction {

        protected processMovement(input: Interfaces.IInputAvatarPayload): Interfaces.IStatePayload {
            let cloneInputVector = input.inputVector.clone;
            if (cloneInputVector.magnitude > 0) {
                cloneInputVector.normalize();
            }

            if (Networking.client.id == Networking.client.idHost && input.doesAbility) {
                (<Player.Player>this.owner).doAbility();
            }

            (<Player.Player>this.owner).move(cloneInputVector);


            let newStatePayload: Interfaces.IStatePayload = { tick: input.tick, position: this.owner.mtxLocal.translation, rotation: this.owner.mtxLocal.rotation }
            return newStatePayload;
        }
    }

    export class ClientPrediction extends AvatarPrediction {

        private inputBuffer: Interfaces.IInputAvatarPayload[];
        private latestServerState: Interfaces.IStatePayload;
        private lastProcessedState: Interfaces.IStatePayload;
        private horizontalInput: number;
        private verticalInput: number;
        protected doesAbility: boolean;

        private AsyncTolerance: number = 0.1;


        constructor(_ownerNetId: number) {
            super(_ownerNetId);
            this.inputBuffer = new Array<Interfaces.IInputAvatarPayload>(this.bufferSize);
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
            let inputPayload: Interfaces.IInputAvatarPayload = { tick: this.currentTick, inputVector: new ƒ.Vector3(this.horizontalInput, this.verticalInput, 0), doesAbility: this.doesAbility };
            this.inputBuffer[bufferIndex] = inputPayload;
            this.stateBuffer[bufferIndex] = this.processMovement(inputPayload);

            //send inputPayload to host
            Networking.sendClientInput(this.ownerNetId, inputPayload);
        }

        switchAvatarAbilityState() {
            if ((<Entity.Entity>this.owner).id == Entity.ID.RANGED) {
                this.doesAbility = (<Player.Ranged>this.owner).dash.doesAbility;
            }
            else {
                this.doesAbility = (<Player.Melee>this.owner).block.doesAbility;
            }
        }


        public onServerMovementState(_serverState: Interfaces.IStatePayload) {
            this.latestServerState = _serverState;
        }

        private handleServerReconciliation() {
            this.lastProcessedState = this.latestServerState;

            let serverStateBufferIndex = this.latestServerState.tick % this.bufferSize;
            let positionError: number = Game.ƒ.Vector3.DIFFERENCE(this.latestServerState.position, this.stateBuffer[serverStateBufferIndex].position).magnitude;
            if (positionError > this.AsyncTolerance) {
                console.warn("you need to be updated to: X:" + this.latestServerState.position.x + " Y: " + this.latestServerState.position.y);
                this.owner.mtxLocal.translation = this.latestServerState.position;
                this.owner.mtxLocal.rotation = this.latestServerState.rotation;

                this.stateBuffer[serverStateBufferIndex] = this.latestServerState;

                let tickToProcess = (this.latestServerState.tick + 1);

                while (tickToProcess < this.currentTick) {
                    let statePayload: Interfaces.IStatePayload = this.processMovement(this.inputBuffer[tickToProcess % this.bufferSize]);

                    let bufferIndex = tickToProcess % this.bufferSize;
                    this.stateBuffer[bufferIndex] = statePayload;

                    tickToProcess++;
                }
            }
        }
    }

    export class ServerPrediction extends AvatarPrediction {

        private inputQueue: Queue = new Queue();

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
                let inputPayload: Interfaces.IInputAvatarPayload = <Interfaces.IInputAvatarPayload>this.inputQueue.dequeue();

                bufferIndex = inputPayload.tick % this.bufferSize;
                let statePayload: Interfaces.IStatePayload = this.processMovement(inputPayload)
                this.stateBuffer[bufferIndex] = statePayload;
            }

            if (bufferIndex != -1) {
                //Send to client new position
                Networking.sendServerBuffer(this.ownerNetId, this.stateBuffer[bufferIndex]);
            }
        }

        public onClientInput(inputPayload: Interfaces.IInputAvatarPayload) {
            this.inputQueue.enqueue(inputPayload);
        }
    }
    //#endregion


    class Queue {
        private items: any[];

        constructor() {
            this.items = [];
        }

        enqueue(_item: Interfaces.IInputAvatarPayload | Interfaces.IInputBulletPayload) {
            this.items.push(_item);
        }

        dequeue(): Interfaces.IInputAvatarPayload | Interfaces.IInputBulletPayload {
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