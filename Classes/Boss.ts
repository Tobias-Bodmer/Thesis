namespace Enemy {
    export class SummonorBoss extends EnemyDumb {
        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);
        }

        update(): void {
            super.update();
        }

        behaviour() {
            let target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;
            //TODO: set to 3 after testing
            if (distance < 5) {
                this.currentState = BEHAVIOUR.FLEE;
            }
            else {
                let nextState = Math.round(Math.random());

                switch (nextState) {
                    case 0:
                        this.currentState = BEHAVIOUR.SUMMON;
                        break;
                    case 1:
                        this.currentState = BEHAVIOUR.IDLE;
                        break;
                    default:
                        break;
                }
            }

        }

        moveBehaviour() {
            this.behaviour();

            switch (this.currentState) {
                case BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    break;
                case BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                    break;
                case BEHAVIOUR.SUMMON:
                    this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                    this.summon();
                    break;
                // default:
                //     // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                //     // break;
            }
        }

        summon() {
            EnemySpawner.spawnByID(Entity.ID.SMALLTICK, this.mtxLocal.translation.toVector2(), new Entity.Attributes(5, 5, 3, Math.random() * 2 + 1, 0, 0));
        }
    }
}