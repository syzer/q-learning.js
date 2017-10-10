function State(name) {
  this.name = name
  this.actions = {}
  this.actionsList = []
}

State.prototype.addAction = function (nextState, reward, actionName) {
  const action = {
    name: actionName === undefined ? nextState : actionName,
    nextState,
    reward
  }
  this.actionsList.push(action)
  this.actions[action.name] = action
}

State.prototype.randomAction = function () {
  return this.actionsList[~~(this.actionsList.length * Math.random())]
}

function QLearner(gamma = 0.8, { rewards = {}, states = {}, statesList = [], currentState = null } = {}) {
  this.gamma = gamma
  this.rewards = rewards
  this.states = states
  this.statesList = statesList
  this.currentState = currentState
}

QLearner.prototype.add = function (from, to, reward, actionName) {
  if (!this.states[from]) {
    this.addState(from)
  }
  if (!this.states[to]) {
    this.addState(to)
  }
  this.states[from].addAction(to, reward, actionName)
}

QLearner.prototype.addState = function (name) {
  const state = new State(name)
  this.states[name] = state
  this.statesList.push(state)
  return state
}

QLearner.prototype.toJson = function () {
  return JSON.stringify({
    gamma: this.gamma,
    rewards: this.rewards,
    states: this.states,
    statesList: this.statesList,
    currentState: this.currentState
  })
}

QLearner.prototype.fromJson = function (jsonStr) {
  return new QLearner(gamma, JSON.parse(jsonStr))
}


QLearner.prototype.setState = function (name) {
  this.currentState = this.states[name]
  return this.currentState
}

QLearner.prototype.getState = function () {
  return this.currentState && this.currentState.name
}

QLearner.prototype.randomState = function () {
  return this.statesList[~~(this.statesList.length * Math.random())]
}

QLearner.prototype.optimalFutureValue = function (state) {
  const stateRewards = this.rewards[state]
  let max = 0
  for (const action in stateRewards) {
    if (stateRewards.hasOwnProperty(action)) {
      max = Math.max(max, stateRewards[action] || 0)
    }
  }
  return max
}

QLearner.prototype.step = function () {
  this.currentState || (this.currentState = this.randomState())
  const action = this.currentState.randomAction()
  if (!action) {
    return null
  }
  this.rewards[this.currentState.name] || (this.rewards[this.currentState.name] = {})
  this.rewards[this.currentState.name][action.name] = (action.reward || 0) + this.gamma * this.optimalFutureValue(action.nextState)
  return this.currentState = this.states[action.nextState]
}

QLearner.prototype.learn = function (steps) {
  steps = Math.max(1, steps || 0)
  while (steps--) {
    this.currentState = this.randomState()
    this.step()
  }
}

QLearner.prototype.bestAction = function (state) {
  const stateRewards = this.rewards[state] || {}
  let bestAction = null
  for (const action in stateRewards) {
    if (stateRewards.hasOwnProperty(action)) {
      if (!bestAction) {
        bestAction = action
      } else if ((stateRewards[action] == stateRewards[bestAction]) && (Math.random() > 0.5)) {
        bestAction = action
      } else if (stateRewards[action] > stateRewards[bestAction]) {
        bestAction = action
      }
    }
  }
  return bestAction
}

QLearner.prototype.knowsAction = function (state, action) {
  return (this.rewards[state] || {}).hasOwnProperty(action)
}

QLearner.prototype.applyAction = function (actionName) {
  const actionObject = this.states[this.currentState.name].actions[actionName]
  if (actionObject) {
    this.currentState = this.states[actionObject.nextState]
  }
  return actionObject && this.currentState
}

QLearner.prototype.runOnce = function () {
  const best = this.bestAction(this.currentState.name)
  const action = this.states[this.currentState.name].actions[best]
  if (action) {
    this.currentState = this.states[action.nextState]
  }
  return action && this.currentState
}
