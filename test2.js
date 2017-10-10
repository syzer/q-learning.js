
function GameBoard() {
  this.canvasId = 'canvas'
  this.scoreId = 'score'

  this.canvasWidth = 300
  this.canvasHeight = 300
  this.width = 10 // Cells
  this.height = 10 // Cells
  this.board = []
  this.empty = 0
  this.agent = 1
  this.foodPoisonRatio = 0.5
  this.density = 0.1
  this.food = 2
  this.poison = 3

  this.score = {}
  this.score[this.food] = 1
  this.score[this.poison] = 1
  this.score[this.empty] = 1

  this.userAction = undefined
  this.exploration = 0.2
  this.canvasContext = undefined

  this.colorDictionary = {}
  this.colorDictionary[this.food] = 'green'
  this.colorDictionary[this.empty] = 'white'
  this.colorDictionary[this.poison] = 'gray'
  this.colorDictionary[this.agent] = 'black'

  this.rewardDictionary = {}
  this.rewardDictionary[this.food] = 1
  this.rewardDictionary[this.empty] = 0
  this.rewardDictionary[this.poison] = -1
  this.agentPosition = {
    line: this.height - 1,
    column: ~~(this.width / 2)
  }
  this.init()
}

GameBoard.prototype.init = function () {
  this.board = [] // The representation of the world
  for (let column = 0; column < this.width; column++) {
    this.board.push([])
    for (let line = 0; line < this.height; line++) {
      this.board[column].push(this.empty)
    }
  }
  const canvas = document.getElementById(this.canvasId)
  this.canvasContext = canvas.getContext('2d')
}

GameBoard.prototype.setPosition = function (column) {
  // Set agents position
  column = (column + this.width) % this.width // Circular world
  this.agentPosition.column = column
  this.board[column][this.agentPosition.line] = this.agent
}

GameBoard.prototype.addMoreObjects = function () {
  // Insert more food and poison
  for (let column = 0; column < this.width; column++) {
    if (Math.random() < this.density) {
      this.board[column][0] = Math.random() < this.foodPoisonRatio ? this.food : this.poison
    } else {
      this.board[column][0] = this.empty
    }
  }
  this.setPosition(this.agentPosition.column)
}

GameBoard.prototype.moveObjectsDown = function () {
  // Advance objects position 1 cell down
  for (let line = this.height - 1; line > 0; line--) {
    for (let column = 0; column < this.width; column++) {
      this.board[column][line] = this.board[column][line - 1]
    }
  }
}

GameBoard.prototype.currentState = function () {
    // Get a string representation of the objects in the 3x3 square in front of the agent
  let state = 'S'
  let line, column
  for (let dcol = -1; dcol <= 1; dcol++) {
    for (let dline = -3; dline < 0; dline++) {
      line = (this.agentPosition.line + dline + this.height) % this.height
      column = (this.agentPosition.column + dcol + this.width) % this.width
      state += this.board[column][line]
    }
  }
  return state
}

GameBoard.prototype.objectAt = function (column, line) {
  return this.board[column][line]
}

GameBoard.prototype.randomAction = function () {
    // Actions are -1,0,+1
  return ~~(Math.random() * 3) - 1
}

GameBoard.prototype.draw = function () {
  const dx = this.canvasWidth / this.width
  const dy = this.canvasHeight / this.height
  const radius = Math.min(dx, dy) / 2.5
  const pi2 = Math.PI * 2
  const context = this.canvasContext
  context.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

  for (let line = 0; line < this.height; line++) {
    for (let column = 0; column < this.width; column++) {
      if (this.board[column][line] === this.empty) {
        continue
      }
      context.beginPath()
      context.arc(dx * (column + 0.5), dy * (line + 0.5), this.board[column][line] !== this.agent ? radius : radius * 1.2, 0, pi2, false)
      context.fillStyle = this.colorDictionary[this.board[column][line]]
      context.fill()
      context.lineWidth = 2
      context.strokeStyle = '#333333'
      context.stroke()
    }
  }
}

const game = new GameBoard()

const learner = new QLearner(0.5)

let sid = setInterval(step, 500)

function slow() {
  clearInterval(sid)
  sid = setInterval(step, 500)
}

function fast() {
  clearInterval(sid)
  sid = setInterval(step, 20)
}

function step() {
  // Memorize current state
  const currentState = game.currentState()
  // Get some action
  const randomAction = game.randomAction()
  // And the best action
  let action = learner.bestAction(currentState)
  // If there is no best action try to explore
  if (action === null || action === undefined || (!learner.knowsAction(currentState, randomAction) && Math.random() < game.exploration)) {
    action = randomAction
  }
  // Action is a number -1,0,+1
  action = Number(action)
  // Apply the action
  game.setPosition(game.agentPosition.column + action)
  // Get next state, compute reward
  game.moveObjectsDown()
  const collidedWith = game.objectAt(game.agentPosition.column, game.agentPosition.line)
  const reward = game.rewardDictionary[collidedWith]

  const nextState = game.currentState()
  learner.add(currentState, nextState, reward, action)

  // Make que q-learning algorithm number of iterations=10 or it could be another number
  learner.learn(10)

  game.addMoreObjects()

    // Some feedback on performance
  game.score[collidedWith]++
  let summary = '<br />green==food: ' + game.score[game.food]
  summary += '<br />gray=poison: ' + game.score[game.poison]
  summary += '<br />poison/food: ' + Math.round(100 * game.score[game.poison] / game.score[game.food]) + '%'
  document.getElementById(game.scoreId).innerHTML = summary
  game.draw()
}

