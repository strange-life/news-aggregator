/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
APP.Main = (function () {
  var LAZY_LOAD_THRESHOLD = 300;
  var $ = document.querySelector.bind(document);

  var stories = null;
  var storyStart = 0;
  var storyEnd = 0;
  var count = 100;
  var main = $('main');
  var header = $('header');
  var headerTitles = header.querySelector('.header__title-wrapper');
  var storyDetails;
  var storyLoadCount = 0;
  var localeData = {
    data: {
      intl: {
        locales: 'en-US',
      },
    },
  };

  var tmplStory = $('#tmpl-story').textContent;
  var tmplStoryDetails = $('#tmpl-story-details').textContent;
  var tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent;

  if (typeof HandlebarsIntl !== 'undefined') {
    HandlebarsIntl.registerWith(Handlebars);
  } else {
    // Remove references to formatRelative, because Intl isn't supported.
    var intlRelative = /, {{ formatRelative time }}/;
    tmplStory = tmplStory.replace(intlRelative, '');
    tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
    tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
  }

  var storyTemplate = Handlebars.compile(tmplStory);
  var storyDetailsTemplate = Handlebars.compile(tmplStoryDetails);
  var storyDetailsCommentTemplate = Handlebars.compile(tmplStoryDetailsComment);

  var defaultStoryHtml = storyTemplate({
    title: '...',
    score: '-',
    by: '...',
    time: 0,
  });
  var commentHtml = storyDetailsCommentTemplate({
    by: '',
    text: 'Loading comment...',
  });

  function makeStory() {
    if (storyStart === storyEnd) return;

    var storiesFragment = document.createDocumentFragment();
    // make 10 story per frame
    var end = Math.min(storyStart + 10, storyEnd);

    while (storyStart < end) {
      var key = stories[storyStart];
      var story = document.createElement('div');

      story.setAttribute('id', 's-' + key);
      story.classList.add('story');
      story.innerHTML = defaultStoryHtml;
      storiesFragment.appendChild(story);

      (function (story) {
        APP.Data.getStoryById(key, function (details) {
          requestAnimationFrame(onStoryData.bind(this, story, details));
        });
      })(story);

      storyStart++;
    }

    main.appendChild(storiesFragment);
    requestAnimationFrame(makeStory);
  }

  /**
   * As every single story arrives in shove its
   * content in at that exact moment. Feels like something
   * that should really be handled more delicately, and
   * probably in a requestAnimationFrame callback.
   */
  function onStoryData(story, details) {
    details.time *= 1000;
    story.addEventListener('click', onStoryClick.bind(this, details));
    story.classList.add('clickable');
    story.innerHTML = storyTemplate(details);
    // Tick down. When zero we can batch in the next load.
    storyLoadCount--;

    // Colorize on complete.
    // if (storyLoadCount === 0) colorizeAndScaleStories();
  }

  function makeComment(container, comments, index) {
    if (index === comments.length) return;

    var commentsFragment = document.createDocumentFragment();
    // make 10 comment per frame
    var end = Math.min(index + 10, comments.length);

    while (index < end) {
      var key = comments[index];
      var comment = document.createElement('aside');
      comment.setAttribute('id', 'sdc-' + key);
      comment.classList.add('story-details__comment');
      comment.innerHTML = commentHtml;
      commentsFragment.appendChild(comment);

      // Update the comment with the live data.
      (function (comment) {
        APP.Data.getStoryComment(key, function (commentDetails) {
          commentDetails.time *= 1000;
          requestAnimationFrame(function () {
            comment.innerHTML = storyDetailsCommentTemplate(
              commentDetails,
              localeData,
            );
          });
        });
      })(comment);

      index++;
    }

    container.appendChild(commentsFragment);
    requestAnimationFrame(makeComment.bind(this, container, comments, index));
  }

  function onStoryClick(details) {
    storyDetails = $('#sd-' + details.id);

    if (storyDetails) {
      requestAnimationFrame(showStory);
      return;
    }

    if (details.url) details.urlobj = new URL(details.url);

    var storyDetailsHtml = storyDetailsTemplate(details);

    storyDetails = document.createElement('section');
    storyDetails.setAttribute('id', 'sd-' + details.id);
    storyDetails.classList.add('story-details');
    storyDetails.innerHTML = storyDetailsHtml;

    var closeButton = storyDetails.querySelector('.js-close');
    var storyHeader = storyDetails.querySelector('.js-header');
    var storyContent = storyDetails.querySelector('.js-content');

    closeButton.addEventListener('click', hideStory);

    requestAnimationFrame(function () {
      document.body.appendChild(storyDetails);

      var headerHeight = storyHeader.getBoundingClientRect().height;
      storyContent.style.marginTop = headerHeight + 'px';
      showStory();
    });

    var kids = details.kids;
    if (typeof kids === 'undefined') return;

    var commentsElement = storyDetails.querySelector('.js-comments');
    requestAnimationFrame(makeComment.bind(this, commentsElement, kids, 0));
  }

  function showStory() {
    if (!storyDetails) return;
    storyDetails.classList.add('active');
  }

  function hideStory() {
    if (!storyDetails) return;
    storyDetails.classList.remove('active');
  }

  // TODO
  /**
   * Does this really add anything? Can we do this kind
   * of work in a cheaper way?
   */
  // function colorizeAndScaleStories() {
  //   var storyElements = document.querySelectorAll('.story');

  //   // It does seem awfully broad to change all the
  //   // colors every time!
  //   for (var s = 0; s < storyElements.length; s++) {
  //     var story = storyElements[s];
  //     var score = story.querySelector('.story__score');
  //     var title = story.querySelector('.story__title');

  //     // Base the scale on the y position of the score.
  //     var height = main.offsetHeight;
  //     var mainPosition = main.getBoundingClientRect();
  //     var scoreLocation =
  //       score.getBoundingClientRect().top -
  //       document.body.getBoundingClientRect().top;
  //     var scale = Math.min(1, 1 - 0.05 * ((scoreLocation - 170) / height));
  //     var opacity = Math.min(1, 1 - 0.5 * ((scoreLocation - 170) / height));

  //     score.style.width = scale * 40 + 'px';
  //     score.style.height = scale * 40 + 'px';
  //     score.style.lineHeight = scale * 40 + 'px';

  //     // Now figure out how wide it is and use that to saturate it.
  //     scoreLocation = score.getBoundingClientRect();
  //     var saturation = 100 * ((scoreLocation.width - 38) / 2);

  //     score.style.backgroundColor = 'hsl(42, ' + saturation + '%, 50%)';
  //     title.style.opacity = opacity;
  //   }
  // }

  main.addEventListener('scroll', function () {
    var scrollTopCapped = Math.min(70, main.scrollTop);
    var scaleString = 'scale(' + (1 - scrollTopCapped / 300) + ')';
    var headerHeight = 156 - scrollTopCapped + 'px';

    // colorizeAndScaleStories();

    requestAnimationFrame(function () {
      document.body.style.paddingTop = headerHeight;
      header.style.height = headerHeight;
      headerTitles.style.webkitTransform = scaleString;
      headerTitles.style.transform = scaleString;

      // Add a shadow to the header.
      if (main.scrollTop > 70) document.body.classList.add('raised');
      else document.body.classList.remove('raised');
    });

    // Check if we need to load the next batch of stories.
    var loadThreshold =
      main.scrollHeight - main.offsetHeight - LAZY_LOAD_THRESHOLD;
    if (main.scrollTop > loadThreshold) loadStoryBatch();
  });

  function loadStoryBatch() {
    if (storyLoadCount > 0) return;

    storyEnd = Math.min(storyStart + count, stories.length);
    storyLoadCount = storyEnd - storyStart;

    requestAnimationFrame(makeStory);
  }

  // Bootstrap in the stories.
  APP.Data.getTopStories(function (data) {
    stories = data;
    loadStoryBatch();
    main.classList.remove('loading');
  });
})();
