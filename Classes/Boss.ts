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
                    if (this.currentAnimation != Entity.ANIMATIONSTATES.IDLE) {
                        this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                        this.currentAnimation = Entity.ANIMATIONSTATES.IDLE;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
                    this.setFrameDirection(1);
                    this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                    break;
                case BEHAVIOUR.FLEE:
                    if (this.currentAnimation != Entity.ANIMATIONSTATES.WALK) {
                        this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["walk"]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                        this.currentAnimation = Entity.ANIMATIONSTATES.WALK;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
                    this.moveDirection = this.moveAway(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                    break;
                case BEHAVIOUR.SUMMON:
                    if (this.currentAnimation != Entity.ANIMATIONSTATES.SUMMON) {
                        this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["summon"]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                        this.currentAnimation = Entity.ANIMATIONSTATES.WALK;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
                    this.summon();
                    break;
                // default:
                //     // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                //     // break;
            }
        }

        summon() {
            EnemySpawner.spawnByID(Entity.ID.SMALLTICK, this.mtxLocal.translation.toVector2(), new Entity.Attributes(5, 5, 3, Math.random() * 2 + 1, 0));
        }
    }
}