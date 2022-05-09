namespace Entity {

    export enum ATTRIBUTETYPE {
        HEALTHPOINTS,
        MAXHEALTHPOINTS,
        KNOCKBACKFORCE,
        HITABLE,
        ARMOR,
        SPEED,
        ATTACKPOINTS,
        COOLDOWNREDUCTION,
        SCALE
    }
    export class Attributes {

        healthPoints: number;
        maxHealthPoints: number;
        knockbackForce: number;
        hitable: boolean = true;
        armor: number;
        speed: number;
        attackPoints: number;
        coolDownReduction: number = 1;
        scale: number;
        accuracy: number = 0;


        constructor(_healthPoints: number, _attackPoints: number, _speed: number, _scale: number, _knockbackForce: number, _armor: number, _cooldownReduction?: number, _accuracy?: number) {
            this.scale = _scale;
            this.armor = _armor;
            this.healthPoints = _healthPoints;
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = _attackPoints;
            this.speed = _speed;
            this.knockbackForce = _knockbackForce
            if (_cooldownReduction != undefined) {
                this.coolDownReduction = _cooldownReduction;
            }
            if (_accuracy != undefined) {
                this.accuracy = _accuracy;
            }
        }

        public updateScaleDependencies() {
            this.maxHealthPoints = Math.round(this.maxHealthPoints * (100 + (10 * this.scale)) / 100);
            this.healthPoints = Math.round(this.healthPoints * (100 + (10 * this.scale)) / 100);
            this.attackPoints = Math.round(this.attackPoints * this.scale);
            this.speed = Math.fround(this.speed / this.scale);
            this.knockbackForce = this.knockbackForce * (100 + (10 * this.scale)) / 100;
            console.log("im beeing called");
        }
    }
}