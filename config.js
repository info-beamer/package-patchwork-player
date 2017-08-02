'use strict';

const store = new Vuex.Store({
  strict: true,
  state: {
    selected_screen: null,
    screens: [],
    devices: {}, // by serial
    view: {
      x: 15, // offset in cm
      y: 20,
      scale: 0.2, // cm per screen pixel
    },
    content: {
      height: 100,
      width: 100,
    },
  },

  mutations: {
    init (state, {devices, config}) {
      var dev_by_serial = {}
      for (var device of devices) {
        dev_by_serial[device.serial] = device;
      }
      state.devices = dev_by_serial;
      var valid_screens = [];
      for (var screen of config.screens) {
        if (dev_by_serial[screen.serial])
          valid_screens.push(screen);
      }
      state.screens = valid_screens;
      state.content = {
        width: config.width,
        height: config.height,
      }
    },
    select_screen (state, screen_id) {
      state.selected_screen = screen_id;
    },
    screen_position(state, {screen_id, x, y}) {
      state.screens[screen_id].x = x;
      state.screens[screen_id].y = y;
    },
    screen_rotation(state, {screen_id, rotation}) {
      state.screens[screen_id].rotation = rotation;
    },
    screen_size(state, {screen_id, inches}) {
      state.screens[screen_id].inches = inches;
    },
    screen_resolution(state, {screen_id, width, height}) {
      state.screens[screen_id].width = width;
      state.screens[screen_id].height = height;
    },
    add_screen(state, serial) {
      var x = 20, y = 20, rotation = 0, inches = 19, width = 1920, height = 1080;
      if (state.screens.length > 0) {
        var screen = state.screens[state.screens.length-1];
        x = screen.x + 10;
        y = screen.y + 10;
        rotation = screen.rotation;
        inches = screen.inches;
        width = screen.width;
        height = screen.height;
      }
      state.screens.push({
        serial: serial,
        x: x,
        y: y,
        rotation: rotation,
        inches: inches,
        width: width,
        height: height,
      });
      state.selected_screen = state.screens.length-1;
    },
    del_screen(state, screen_id) {
      state.screens.splice(screen_id, 1);
      state.selected_screen = null;
    },
    set_content_size(state, {width, height}) {
      state.content.width = width;
      state.content.height = height;
    },
    set_view_position(state, {x, y}) {
      state.view.x = x;
      state.view.y = y;
    },
  },

  actions: {
    init (context, init) {
      context.commit('init', init);
    },
    select_screen (context, screen_id) {
      context.commit('select_screen', screen_id);
    },
    screen_position (context, pos) {
      context.commit('screen_position', pos);
    },
    screen_rotation (context, rot) {
      context.commit('screen_rotation', rot);
    },
    screen_size (context, size) {
      context.commit('screen_size', size);
    },
    screen_resolution(context, res) {
      context.commit('screen_resolution', res);
    },
    add_screen(context, serial) {
      context.commit('add_screen', serial);
    },
    del_screen(context, screen_id) {
      context.commit('del_screen', screen_id);
    },
    set_content_size(context, size) {
      context.commit('set_content_size', size);
    },
    set_view_position(context, pos) {
      context.commit('set_view_position', pos);
    },
  }
});

Vue.component('config-ui', {
  template: '#config-ui',
  data: () => ({
    selected_serial: '',
  }),
  computed: {
    num_screens() {
      var s = this.$store.state;
      return s.screens.length;
    },
    selected_screen() {
      return this.$store.state.selected_screen;
    },
    spare_devices() {
      var s = this.$store.state;
      var spare = [];
      for (var serial in s.devices) {
        var used = false;
        for (var screen of s.screens) {
          if (screen.serial == serial)
            used = true;
        }
        if (!used) {
          spare.push(s.devices[serial]);
        }
      }
      return spare;
    },
  },
  methods: {
    onWheel(evt) {
      console.log('area zoom', evt);
    },
    onAddScreen(device) {
      this.$store.dispatch('add_screen', this.selected_serial);
      this.selected_serial = '';
    },
  }
})

Vue.component('content-area', {
  template: '#content-area',
  data: () => ({
    dragging: false,
    drag_pos: null,
  }),
  computed: {
    content() {
      return this.$store.state.content;
    },
    view() {
      return this.$store.state.view;
    },
    transform() {
      var offset_x = this.view.x / this.view.scale;
      var offset_y = this.view.y / this.view.scale;
      return "translate(" + offset_x + "," + offset_y + ")";
    },
    pixel_width() {
      return this.content.width / this.view.scale;
    },
    pixel_height() {
      return this.content.height / this.view.scale;
    },
    fill() {
      var s = this.$store.state;
      return s.selected_screen == null ? "lightgreen" : "url(#deselected)";
    },
  },
  methods: {
    onDragStart(evt) {
      this.dragging = true;
      this.drag_pos = {x: evt.clientX, y: evt.clientY};
    },
    onDragMove(evt) {
      if (!this.dragging)
        return;
      this.$store.dispatch('set_view_position', {
        x: this.view.x + (evt.clientX - this.drag_pos.x) * this.view.scale,
        y: this.view.y + (evt.clientY - this.drag_pos.y) * this.view.scale,
      });
      this.drag_pos = {x: evt.clientX, y: evt.clientY};
    },
    onDragStop() {
      this.dragging = false;
    },
    onSelected(evt) {
      this.$store.dispatch('select_screen', null);
    },
  }
})

Vue.component('floating-screen', {
  template: '#floating-screen',
  props: ["screen_id"],
  data: () => ({
    dragging: false,
    drag_pos: null,
  }),
  computed: {
    screen() {
      return this.$store.state.screens[this.screen_id];
    },
    device() {
      var s = this.$store.state;
      return s.devices[this.screen.serial];
    },
    view() {
      return this.$store.state.view;
    },
    transform() {
      var s = this.$store.state;
      var x = (s.view.x + this.screen.x) / this.view.scale;
      var y = (s.view.y + this.screen.y) / this.view.scale;
      return "rotate(" + this.screen.rotation + "," + x + "," + y + ") " +
             "translate(" + x + "," + y + ")";
    },
    cm_per_pixel() {
      var diagonal_pixels = Math.sqrt(
        Math.pow(this.screen.width, 2) +
        Math.pow(this.screen.height, 2)
      );
      return (this.screen.inches * 2.54) / diagonal_pixels;
    },
    pixel_width() {
      return this.cm_per_pixel * this.screen.width / this.view.scale;
    },
    pixel_height() {
      return this.cm_per_pixel * this.screen.height / this.view.scale;
    },
    color() {
      if (this.is_selected)
        return 'green';
      return 'darkgray';
    },
    is_selected() {
      return this.$store.state.selected_screen == this.screen_id;
    },
  },
  methods: {
    onDragStart(evt) {
      this.dragging = true;
      this.drag_pos = {x: evt.clientX, y: evt.clientY};
      this.$store.dispatch('select_screen', this.screen_id);
    },
    onDragMove(evt) {
      if (!this.dragging)
        return;
      this.$store.dispatch('screen_position', {
        screen_id: this.screen_id,
        x: this.screen.x + (evt.clientX - this.drag_pos.x) * this.view.scale,
        y: this.screen.y + (evt.clientY - this.drag_pos.y) * this.view.scale,
      });
      this.drag_pos = {x: evt.clientX, y: evt.clientY};
    },
    onDragStop() {
      this.dragging = false;
    },
    onWheel(evt) {
      var scroll_direction = evt.deltaY < 0 ? -1 : 1;
      this.$store.dispatch('screen_rotation', {
        screen_id: this.screen_id,
        rotation: this.screen.rotation + scroll_direction * 2,
      })
    },
  }
})

Vue.component('area-editor', {
  template: '#area-editor',
  computed: {
    content() {
      var s = this.$store.state;
      return s.content;
    },
  },
  methods: {
    onUpdateWidth(evt) {
      var v = parseFloat(evt.target.value);
      if (isNaN(v)) return;
      var s = this.$store.state;
      this.$store.dispatch('set_content_size', {
        width: v,
        height: s.content.height,
      });
    },
    onUpdateHeight(evt) {
      var v = parseFloat(evt.target.value);
      if (isNaN(v)) return;
      var s = this.$store.state;
      this.$store.dispatch('set_content_size', {
        width: s.content.width,
        height: v,
      });
    },
  }
})

Vue.component('screen-editor', {
  template: '#screen-editor',
  props: ["screen_id"],
  computed: {
    screen() {
      var s = this.$store.state;
      return s.screens[this.screen_id];
    },
    device() {
      var s = this.$store.state;
      return s.devices[this.screen.serial];
    },
    resolutions() {
      return [
        {key: "1024x768",  value: "1024x768"},
        {key: "1280x1024", value: "1280x1024"},
        {key: "1280x720",  value: "1280x720 (HD ready)"},
        {key: "1280x800",  value: "1280x800"},
        {key: "1920x1080", value: "1920x1080 (FullHD)"},
        {key: "1920x1280", value: "1920x1280"},
      ]
    },
    current_resolution_key() {
      return this.screen.width + 'x' + this.screen.height;
    }
  },
  methods: {
    onUpdateX(evt) {
      var v = parseFloat(evt.target.value);
      if (isNaN(v)) return;
      this.$store.dispatch('screen_position', {
        screen_id: this.screen_id,
        x: v, y: this.screen.y,
      })
    },
    onUpdateY(evt) {
      var v = parseFloat(evt.target.value);
      if (isNaN(v)) return;
      this.$store.dispatch('screen_position', {
        screen_id: this.screen_id,
        x: this.screen.x, y: v,
      })
    },
    onUpdateRotation(evt) {
      var v = parseFloat(evt.target.value);
      if (isNaN(v)) return;
      this.$store.dispatch('screen_rotation', {
        screen_id: this.screen_id,
        rotation: v,
      })
    },
    onUpdateSize(evt) {
      var v = parseFloat(evt.target.value);
      if (isNaN(v)) return;
      this.$store.dispatch('screen_size', {
        screen_id: this.screen_id,
        inches: v,
      })
    },
    onResolution(evt) {
      var res = evt.target.value.split('x');
      this.$store.dispatch('screen_resolution', {
        screen_id: this.screen_id,
        width: parseInt(res[0]),
        height: parseInt(res[1]),
      })
    },
    onDelete() {
      this.$store.dispatch('del_screen', this.screen_id);
    },
  }
})

Vue.component('help-icon', {
  template: '#help-icon',
  props: ['target'],
  methods: {
    onClick() {
      var url = ib.getDocLink(this.target);
      var win = window.open(url, '_blank');
      win.focus();
    }
  }
})

const app = new Vue({
  el: "#app",
  store,
})

ib.setDefaultStyle();
ib.ready.then(() => {
  store.dispatch('init', {
    config: ib.config,
    devices: ib.devices,
  });
  store.subscribe((mutation, state) => {
    ib.setConfig({
      screens: state.screens,
      width: state.content.width,
      height: state.content.height,
    })
  })
})
