import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {LetterTile, LetterTileState} from '../letter-tile';
import {animate, keyframes, query, stagger, state, style, transition, trigger} from '@angular/animations';
import {interval} from 'rxjs';
import {MissingLetter} from '../interfaces';
import {and} from '@angular/router/src/utils/collection';


enum MyState {
  Waiting = 'waiting',
  Incorrect = 'incorrect',
  Correct = 'correct'
}

@Component({
  selector: 'app-missing-letter',
  templateUrl: './missing-letter.component.html',
  styleUrls: ['./missing-letter.component.scss'],
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', style({ opacity: 0 }), {optional: true}),
        query(':enter', stagger('-100ms', [
          animate('1s ease-in', keyframes([
            style({opacity: 0, transform: 'translateX(-175%)', offset: 0}),
            style({opacity: .5, transform: 'translateX(10px)',  offset: 0.3}),
            style({opacity: 1, transform: 'translateX(0)',     offset: 1.0}),
          ]))]), {optional: true}),
        query(':leave', stagger('-100ms', [
          animate('1s ease-in', keyframes([
            style({opacity: 1, transform: 'translateX(0)', offset: 0}),
            style({opacity: .5, transform: 'translateX(-10px)',  offset: 0.3}),
            style({opacity: 0, transform: 'translateX(175%)',     offset: 1.0}),
          ]))]), {optional: true})

      ])
    ])
  ]
})
export class MissingLetterComponent implements OnInit {

  @Input()
  missingLetter: MissingLetter;
  responseTimes: number[] = [];

  tiles: LetterTile[];
  missingTiles: LetterTile[];
  missingTileIndex = 0;
  options: string[] = [];
  incorrectChoices: string[] = [];
  state = MyState.Waiting;

  @Output()
  done: EventEmitter<boolean> = new EventEmitter();

  @Output()
  initialResponse: EventEmitter<number> = new EventEmitter();

  @Output()
  buttonPressed: EventEmitter<string> = new EventEmitter();

  constructor() {
  }


  ngOnInit() {
    const word = this.missingLetter.content.toString();

    const missingIndexes = [];
    for (let count = 0; count < this.missingLetter.numberMissing; count++) {
      let missingIndex = Math.floor(Math.random() * word.length);
      while (word.charAt(missingIndex) === ' ' || missingIndexes.includes(missingIndex)) {
        missingIndex = Math.floor(Math.random() * word.length);
      }
      missingIndexes.push(missingIndex);
      console.log('Removing letter at index : ' + missingIndex);
    }
    missingIndexes.sort();

    this.tiles = [];
    this.missingTiles = [];
    let letter = '';
    for (let i = 0; i < word.length; i++) {
      letter = word.charAt(i).toUpperCase();
      const tile = {letter: letter, letterDisplayed: letter, state: LetterTileState.Provided};
      if (letter === ' ') {
        tile.state = LetterTileState.Blank;
      }
      if (missingIndexes.includes(i)) {
        console.log('The missing tile is : ' + tile.letter);
        tile.state = LetterTileState.MissingInactive;
        tile.letterDisplayed = ' ';
        this.missingTiles.push(tile);
      }
      this.tiles.push(tile);
    }
    this.setOptions();
  }

  setOptions() {
    // Calculate a set of 4 possible options for the user to select, one of them being the correct letter
    const correctLetter = this.missingTiles[this.missingTileIndex].letter;
    this.missingTiles[this.missingTileIndex].state = LetterTileState.MissingActive;

    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.replace(correctLetter, '');
    const rand_index = Math.floor(Math.random() * 4);
    this.options = [];
    for (let i = 0; i < 4;) {
      const letter = possible.charAt(Math.floor(Math.random() * possible.length));
      if (this.options.indexOf(letter) === -1) {
        this.options.push(letter);
        i++;
      }
    }
    this.options[rand_index] = correctLetter;
  }


  selectLetter(letter) {
    this.responseTimes.push(performance.now());
    this.missingTiles[this.missingTileIndex].letterDisplayed = letter;
    this.buttonPressed.emit(letter);

    // If the answer is correct
    if (letter === this.missingTiles[this.missingTileIndex].letter) {
      this.missingTiles[this.missingTileIndex].state = LetterTileState.Correct;
      this.missingTileIndex++;
      // if there is another missing letter to complete, set that up.otherwise we are all done.
      if (this.missingTileIndex === this.missingLetter.numberMissing ) {
        this.allDone();
      } else {
//        this.state = MyState.Waiting;
//        this.setOptions();
        this.nextLetter();
      }
    } else {
      this.state = MyState.Incorrect;
      this.missingTiles[this.missingTileIndex].state = LetterTileState.Incorrect;
      this.incorrectChoices.push(letter);
    }
  }

  nextLetter() {
    this.state = MyState.Correct;
    this.options = [];
    const waitASectionTimer = interval(1500);
    const sub = waitASectionTimer.subscribe( n => {
      this.state = MyState.Waiting;
      this.setOptions();
      sub.unsubscribe();
    });
  }

  allDone() {
    this.state = MyState.Correct;
    const waitASectionTimer = interval(1000);
    const sub = waitASectionTimer.subscribe( n => {
      this.initialResponse.emit(this.responseTimes[0]);
      this.done.emit(this.incorrectChoices.length === 0);
      sub.unsubscribe();
    });
  }

  isIncorrectChoice(letter) {
    return this.incorrectChoices.indexOf(letter) >= 0;
  }


}
