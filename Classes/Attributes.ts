namespace Entity {
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


        constructor(_healthPoints: number, _attackPoints: number, _speed: number, _scale: number, _knockbackForce: number, _cooldownReduction?: number) {
            this.scale = _scale;
            this.healthPoints = Math.fround(_healthPoints * (100 + (10 * this.scale)) / 100);
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = Math.fround(_attackPoints * this.scale);
            this.speed = Math.fround(_speed / this.scale);
            this.knockbackForce = _knockbackForce
            this.knockbackForce = this.knockbackForce * (100 + (10 * this.scale)) / 100;
            if (_cooldownReduction != undefined) {
                this.coolDownReduction = _cooldownReduction;
            }
        }
    }
}