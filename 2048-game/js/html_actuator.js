function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;

  // 排行榜相關
  this.leaderboardOverlay = document.querySelector(".leaderboard-overlay");
  this.leaderboardBody    = document.querySelector(".leaderboard-body");
  this.leaderboardClose   = document.querySelector(".leaderboard-close");
  this.leaderboardBtn     = document.querySelector(".leaderboard-button");
  this.submitOverlay      = document.querySelector(".submit-overlay");
  this.submitForm         = document.querySelector(".submit-form");
  this.submitInput        = document.querySelector(".submit-input");
  this.submitCancel       = document.querySelector(".submit-cancel");
  this.submitError        = document.querySelector(".submit-error");

  // API 基礎 URL（部署時會由 nginx 設定，或由 game_manager 傳入）
  this.apiBaseUrl = window.__API_BASE_URL__ || '';

  this._bindLeaderboardEvents();
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;

  // 遊戲結束時顯示提交分數按鈕
  if (!won) {
    this._showSubmitScore();
  }
};

HTMLActuator.prototype._showSubmitScore = function () {
  var self = this;
  // 延遲一下讓 Game Over 動畫先跑完
  setTimeout(function () {
    self.submitOverlay.classList.add("active");
  }, 800);
};

HTMLActuator.prototype._hideSubmitScore = function () {
  this.submitOverlay.classList.remove("active");
  this.submitError.textContent = "";
  this.submitInput.value = "";
};

HTMLActuator.prototype._bindLeaderboardEvents = function () {
  var self = this;

  // 提交分數
  if (this.submitForm) {
    this.submitForm.addEventListener("submit", function (e) {
      e.preventDefault();
      self._handleSubmitScore();
    });
  }

  // 取消提交
  if (this.submitCancel) {
    this.submitCancel.addEventListener("click", function () {
      self._hideSubmitScore();
    });
  }

  // 開啟排行榜
  if (this.leaderboardBtn) {
    this.leaderboardBtn.addEventListener("click", function () {
      self._fetchLeaderboard();
    });
  }

  // 關閉排行榜
  if (this.leaderboardClose) {
    this.leaderboardClose.addEventListener("click", function () {
      self.leaderboardOverlay.classList.remove("active");
    });
  }

  // 點擊背景關閉
  if (this.leaderboardOverlay) {
    this.leaderboardOverlay.addEventListener("click", function (e) {
      if (e.target === self.leaderboardOverlay) {
        self.leaderboardOverlay.classList.remove("active");
      }
    });
  }
};

HTMLActuator.prototype._handleSubmitScore = function () {
  var self = this;
  var playerName = this.submitInput.value.trim();

  if (!playerName) {
    this.submitError.textContent = "請輸入名稱";
    return;
  }

  if (playerName.length > 20) {
    this.submitError.textContent = "名稱最多 20 個字元";
    return;
  }

  this.submitError.textContent = "提交中...";

  var apiUrl = this.apiBaseUrl + '/api/scores';

  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player_name: playerName,
      score: this.score
    })
  })
  .then(function (res) {
    if (!res.ok) {
      return res.json().then(function (data) {
        throw new Error(data.error || '提交失敗');
      });
    }
    return res.json();
  })
  .then(function (data) {
    self.submitError.textContent = "✅ 分數已提交！排名第 " + data.rank + " 名";
    setTimeout(function () {
      self._hideSubmitScore();
    }, 1500);
  })
  .catch(function (err) {
    self.submitError.textContent = "❌ " + err.message;
  });
};

HTMLActuator.prototype._fetchLeaderboard = function () {
  var self = this;
  var apiUrl = this.apiBaseUrl + '/api/leaderboard?limit=20';

  // 清空並顯示載入中
  this.leaderboardBody.innerHTML = '<tr><td colspan="3" class="leaderboard-loading">載入中...</td></tr>';
  this.leaderboardOverlay.classList.add("active");

  fetch(apiUrl)
    .then(function (res) {
      if (!res.ok) {
        throw new Error('無法載入排行榜');
      }
      return res.json();
    })
    .then(function (data) {
      self._renderLeaderboard(data.leaderboard);
    })
    .catch(function (err) {
      self.leaderboardBody.innerHTML =
        '<tr><td colspan="3" class="leaderboard-error">❌ ' + err.message + '</td></tr>';
    });
};

HTMLActuator.prototype._renderLeaderboard = function (leaderboard) {
  var html = "";

  if (!leaderboard || leaderboard.length === 0) {
    html = '<tr><td colspan="3" class="leaderboard-empty">暫無紀錄</td></tr>';
  } else {
    leaderboard.forEach(function (entry, index) {
      var rankClass = "";
      if (index === 0) rankClass = "rank-gold";
      else if (index === 1) rankClass = "rank-silver";
      else if (index === 2) rankClass = "rank-bronze";

      var medal = "";
      if (index === 0) medal = "🥇";
      else if (index === 1) medal = "🥈";
      else if (index === 2) medal = "🥉";

      html += '<tr class="' + rankClass + '">' +
        '<td class="leaderboard-rank">' + (medal || (index + 1)) + '</td>' +
        '<td class="leaderboard-name">' + self._escapeHtml(entry.player_name) + '</td>' +
        '<td class="leaderboard-score">' + entry.score.toLocaleString() + '</td>' +
        '</tr>';
    });
  }

  this.leaderboardBody.innerHTML = html;
};

HTMLActuator.prototype._escapeHtml = function (text) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
