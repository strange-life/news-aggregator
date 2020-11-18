# Udacity 60fps Course Samples

**Please note: this code is intended for you to hone your debugging skills. It contains a lot of code that you should not use in production!**

This is a simple web app that shows the top stories from [Hacker News](https://news.ycombinator.com/news) via [its API](http://blog.ycombinator.com/hacker-news-api).

Unfortunately it has a bunch of performance issues, such as:

- Layout Thrashing
- Expensive painting
- Unnecessary layouts
- Long-running and badly-timed JavaScript
- Bad touch handling

Your mission is to find and fix the issues, and make the app gloriously performant!

## License

See /LICENSE for more.

This is not a Google product.

## 优化笔记

应用的四个生命周期阶段时间预算约为

- Load(加载阶段)：1s
- Idle(加载完成后的闲置阶段): 50ms
- Response(响应用户操作): 100ms
- Animate(动画)：16ms

加载时间可以通过三个指标来优化

- 关键资源数量
  指页面渲染必须的资源，一个页面最少只需要一个关键资源就是 `Html` 文件，如果有外部 `CSS`、`Font`、`JavaScript` 等默认也会成为关键资源
- 关键资源大小
  指关键资源文件大小
- 和服务器之间来回的次数
  指浏览器需要和服务器交流的次数，比如正常情况下浏览器会预先扫描需要下载的资源一次性请求，但通过 `@import` 引入 `CSS` 或者动态添加外部 `script` 标签等浏览器无法预知的操作会增加来回次数

[优化实例](https://github.com/strange-life/frontend-nanodegree-mobile-portfolio/tree/my-solution)

浏览器每一帧的顺序是
![JavaScript -> Style -> Layout -> Paint -> Composite](frame-full.jpg)
其中只有 `JavaScript`、`Style`、`Composite` 是必须步骤，我们应该尽量按照这个顺序安排需要处理的工作，比如在脚本中频繁读取强制浏览器 `Layout` 的属性如：`offset*`、`scroll*`，会导致不停的从 `Layout` 步骤跳回 `JavaScript`，此时应该尽量使用缓存的值而不是每一次都重新读取。不同的 `CSS` 属性会触发哪些步骤可以参考这个网站 [CSS triggers](https://csstriggers.com/)

性能优化的原则永远是：先衡量再优化
优化也要看是否需要，应该只优化用户在意的地方，没有必要保证所有操作都达到 60 fps

要达到 60 fps 则每一帧我们只有大约 16ms 的时间，去掉浏览器处理其它工作的时间大约还剩下 10ms，要在 10ms 内完成上述五个步骤，留给 `JavaScript` 的时间只有 3ms ~ 4ms

- 通过开发工具测量性能时最好关掉所有浏览器扩展，会产生很多噪音数据

- 通过操作会强制浏览器 `Layout` 的属性或方法如 `width`、`height`、`top`、`getBoundingClientRect` 等来实现动画的性能非常差，考虑使用 `will-change` 和 `transform` 来代替，因为这样会把元素提升到单独的图层，只需要 `JavaScript` 和 `Composite` 两个步骤，如果是通过 `CSS` 触发的动画则只需要 `Composite` 一个步骤

- 要克制的将元素提升到单独图层，虽然单独图层可以优化性能但是也会带来额外的内存和 `Composite` 开销，有时在移动设备上影响比较明显

- 理论上会引起界面变化的 `JavaScript` 都应该通过 `requestAnimationFrame` 调用，这样可以保持上面的顺序，当然也不用太过绝对，具体情况具体讨论

- 繁重的计算考虑使用 `web worker`
