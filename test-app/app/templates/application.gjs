import pageTitle from 'ember-page-title/helpers/page-title';
import DemoTimeline from 'test-app/components/demo-timeline';
import DemoVerticalGrid from 'test-app/components/demo-vertical-grid';

<template>
  {{pageTitle "TestApp"}}

  <DemoTimeline />
  <DemoVerticalGrid />

  {{outlet}}
</template>
