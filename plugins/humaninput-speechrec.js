/**
 * humaninput-speechrec.js
 * Copyright (c) 2016, Dan McDougall
 *
 * HumanInput Speech Recognition Plugin - Adds support for speech recognition to HumanInput.
 */


(function() {
"use strict";

HumanInput.defaultListenEvents.push('speech');

var speechEvent = (
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    window.mozSpeechRecognition ||
    window.msSpeechRecognition ||
    window.oSpeechRecognition);

var SpeechRecPlugin = function(HI) {
    var self = this;
    self.__name__ = 'SpeechRecPlugin';
    self.exports = {};
    self._rtSpeech = []; // Tracks real-time speech so we don't repeat ourselves
    self._rtSpeechPop = function() {
        // Pop out the first item (oldest)
        self._rtSpeech.reverse();
        self._rtSpeech.pop();
        self._rtSpeech.reverse();
    };
    self._rtSpeechTimer = null;
    self.startSpeechRec = function() {
        self._recognition = new webkitSpeechRecognition();
        self.log.debug('Starting speech recognition', self._recognition);
        self._recognition.lang = HI.settings.speechLang || navigator.language || "en-US";
        self._recognition.continuous = true;
        self._recognition.interimResults = true;
        self._recognition.onresult = function(e) {
            var i, event, transcript;
            for (i = e.resultIndex; i < e.results.length; ++i) {
                transcript = e.results[i][0].transcript.trim();
                if (e.results[i].isFinal) {
// NOTE: We have to replace - with – (en dash aka \u2013) because strings like 'real-time' would mess up event combos
                    event = 'speech:"' +  transcript.replace(/-/g, '–') + '"';
                    HI._addDown(event);
                    HI._handleDownEvents(e, transcript);
                    HI._handleSeqEvents();
                    HI._removeDown(event);
                } else {
                    // Speech recognition that comes in real-time gets the :rt: designation:
                    event = 'speech:rt:' +  transcript.replace(/-/g, '–') + '"';
                    if (self._rtSpeech.indexOf(event) == -1) {
                        self._rtSpeech.push(event);
                        HI._addDown(event);
                        HI._handleDownEvents(e, transcript);
// NOTE: Real-time speech events don't go into the sequence buffer because it would
//       fill up with garbage too quickly and mess up the ordering of other sequences.
                        HI._removeDown(event);
                    }
                }
            }
        };
        self._started = true;
        self._recognition.start();
    };
    self.stopSpeechRec = function() {
        self.log.debug('Stopping speech recognition');
        self._recognition.stop();
        self._started = false;
    };
    return self;
};

SpeechRecPlugin.prototype.init = function(HI) {
    var self = this, l = HI.l;
    self.log = new HI.logger(HI.settings.logLevel || 'INFO', '[HI Speech]');
    self.log.debug(l("Initializing Speech Recognition Plugin"), self);
    HI.settings.autostartSpeech = HI.settings.autostartSpeech || false; // Don't autostart by default
    if (HI.settings.listenEvents.indexOf('speech') != -1) {
        if (speechEvent) {
            if (HI.settings.autostartSpeech) {
                self.startSpeechRec();
            }
            HI.on('document:hidden', function() {
                if (self._started) {
                    self.stopSpeechRec();
                }
            });
            HI.on('document:visible', function() {
                if (!self._started && HI.settings.autostartSpeech) {
                    self.startSpeechRec();
                }
            });
        } else { // Disable the speech functions
            self.startSpeechRec = HI.noop;
            self.stopSpeechRec = HI.noop;
        }
    }
    // Exports (these will be applied to the current instance of HumanInput)
    self.exports.startSpeechRec = self.startSpeechRec;
    self.exports.stopSpeechRec = self.stopSpeechRec;
    return self;
};

HumanInput.plugins.push(SpeechRecPlugin);

}).call(this);