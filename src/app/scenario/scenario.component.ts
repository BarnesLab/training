import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';
import { Page, PageData, Scenario, Session, Study } from '../interfaces';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-scenario',
  templateUrl: './scenario.component.html',
  styleUrls: ['./scenario.component.scss'],
  animations: [
    trigger('flyUpDown', [
      state('in', style({transform: 'translateY(0)'})),
      transition('void => *', [
        animate(600, keyframes([
          style({opacity: 0, transform: 'translateY(100%)', offset: 0}),
          style({opacity: 1, transform: 'translateY(15px)',  offset: 0.3}),
          style({opacity: 1, transform: 'translateY(0)',     offset: 1.0})
        ]))
      ]),
      transition('* => void', [
        animate(300, keyframes([
          style({opacity: 1, transform: 'translateY(0)',     offset: 0}),
          style({opacity: 1, transform: 'translateY(-15px)', offset: 0.7}),
          style({opacity: 0, transform: 'translateY(-100%)',  offset: 1.0})
        ]))
      ])
    ]),
    trigger('titleState', [
      state('Intro', style({
        transform: 'translateY(150%) translateX(150%) scale(4)'
      })),
      state('*',   style({
        color: '#000',
        transform: 'scale(1)',
        opacity: 0
      })),
      transition('Intro => *', animate('600ms ease-in')),
      transition('* => Intro', animate('600ms ease-out'))
    ]),
    trigger('imageState', [
      state('Intro', style({
        opacity: 1
      })),
      state('*',   style({
        opacity: 0
      })),
      transition('* => Intro', animate('600ms ease-in')),
      transition('Intro => *', animate('600ms ease-out'))
    ]),
  ]
})
export class ScenarioComponent implements OnInit, OnChanges {

  @Input()
  scenario: Scenario;
  @Input()
  scenarioIndex: number;
  @Input()
  session: Session;
  @Input()
  sessionIndex: number;
  @Input()
  pageCount: number;

  study: Study;
  pageIndex = 0;
  pagesCorrect = 0;
  currentPage: Page;
  state: string;
  pageData: PageData[] = [];
  scenarioCorrect: boolean;
  pageCorrect: boolean;
  startTime: number;
  endTime: number;
  pageCounter: number;
  elementCounter = 1;

  @Output()
  done: EventEmitter<boolean> = new EventEmitter();

  @Output()
  finalCount: EventEmitter<number> = new EventEmitter();

  constructor (
    private api: ApiService
  ) { }

  ngOnInit() {
    // setting up the page counter in order to transition seamlessly between the session steps and round scenarios
    // the count must begin after the page count that gets established in the step component
    if (this.pageCount) {
      this.pageCounter = this.pageCount + 1;
    } else {
      this.pageCounter = 1;
    }
    this.study = {name: '', currentSession: '', currentSessionIndex: 0, conditioning: ''};
    this.api.getStudy().subscribe(study => {
      if (study) {
        this.study = {name: study.name, currentSession: study.currentSession['name'], currentSessionIndex: study.currentSession['index'],
          conditioning: study.conditioning};
      }
    });
    this.init();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.currentPage = this.scenario.pages[0];
    console.log(this.currentPage);
    this.state = this.currentPage.elements[0].type;
    if (changes.scenario && !changes.scenario.isFirstChange()) {
      console.log('New scenario!');
      this.scenario = changes.scenario.currentValue;
      this.init();
    }
  }

  init() {
    this.pageIndex = 0;
    this.scenario.numCorrect = 0;
    this.currentPage = this.scenario.pages[0];
    this.state = this.currentPage.elements[0].type;
    this.scenarioCorrect = true;
    this.pageCorrect = true;
    this.pageData = [];
    this.startTime = performance.now();
    window.scrollTo(0, 0);
  }

  continueButtonVisible() {
    return this.state === 'Intro';
  }

  showStatement() {
    return(this.state === 'Statements' || this.state === 'MissingLetter' || this.state === 'FillInBlank');
  }

  recordStateData() {
    this.endTime = performance.now();
    for (const el of this.currentPage.elements) {
      const Data = {
        session: this.session.session, sessionIndex: this.sessionIndex, sessionTitle: this.session.title + ': ' + this.session.subTitle,
        device: navigator.userAgent, rt: this.endTime - this.startTime, rtFirstReact: 0, stepTitle: this.scenario.title,
        stepIndex: this.scenarioIndex, stimulus: '', trialType: this.state, buttonPressed: '',
        correct: this.pageCorrect, timeElapsed: this.endTime - this.session.startTime, conditioning: this.study.conditioning,
        study: this.study.name, sessionCounter: this.pageCounter + '.' + this.elementCounter
      };

      if (el.responseTime) {
        Data['rtFirstReact'] = el.responseTime - this.startTime;
      } else {
        Data['rtFirstReact'] = this.endTime - this.startTime;
      }

      if (el.buttonPressed) {
        Data['buttonPressed'] = el.buttonPressed;
      }

      if (el.content instanceof Array) {
        Data['stimulus'] = el.content.join(', ');
      } else {
        Data['stimulus'] = el.content;
      }

      this.elementCounter++;
      this.pageData.push(Data);
    }

    console.log('pageData', this.pageData);
    this.api.saveProgress(this.pageData).subscribe(data => {
      this.pageCounter++;
    });
  }

  progressState(correctAnswer = true) {
    if (!correctAnswer) {
      this.scenarioCorrect = false;
      this.pageCorrect = false;
    } else {
      this.scenario.numCorrect ++;
    }
    this.recordStateData();
    this.elementCounter = 1;
    this.pageData = [];
    this.pageCorrect = true;
    this.pageIndex++;
    if (this.pageIndex < this.scenario.pages.length) {
      this.currentPage = this.scenario.pages[this.pageIndex];
      this.state = this.currentPage.elements[0].type;
    } else {
      this.done.emit(this.scenarioCorrect);
      this.finalCount.emit(this.pageCounter);
    }
    window.scrollTo(0, 0);
  }
}
