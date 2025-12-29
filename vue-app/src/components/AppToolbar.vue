<template>
  <v-app-bar color="primary" app flat>
    <v-container fluid class="px-4">
      <div class="d-flex align-center">
        <v-icon class="me-3 d-none d-md-flex" size="28">mdi-microphone</v-icon>
        <v-app-bar-title class="font-weight-medium me-4 d-none d-md-flex">
          实时语音识别
        </v-app-bar-title>
        
        <!-- 实时翻译开关 -->
        <v-switch
          :model-value="enableTranslation"
          @update:model-value="$emit('update:enableTranslation', $event)"
          label="实时翻译"
          color="secondary"
          hide-details
          density="compact"
          class="me-3"
          style="flex: 0 0 auto;"
        />
        
        <!-- 翻译服务选择器 -->
        <v-select
          :model-value="translationService"
          @update:model-value="$emit('update:translationService', $event)"
          :items="translationServiceItems"
          label="翻译服务"
          variant="outlined"
          density="compact"
          :disabled="!enableTranslation"
          hide-details
          class="toolbar-select me-3"
          style="max-width: 140px;"
        >
          <template v-slot:selection="{ item }">
            <span class="text-truncate">{{ item.raw.icon }} {{ item.title }}</span>
          </template>
          <template v-slot:item="{ item, props }">
            <v-list-item v-bind="props" density="compact">
              <template v-slot:prepend>
                <span class="me-2">{{ item.raw.icon }}</span>
              </template>
              <template v-slot:append>
                <v-chip v-if="item.raw.free" size="x-small" color="success" variant="outlined">免费</v-chip>
                <v-chip v-if="item.raw.local" size="x-small" color="info" variant="outlined" class="ml-1">本地</v-chip>
                <v-chip v-if="item.raw.limit" size="x-small" color="warning" variant="outlined" class="ml-1">{{ item.raw.limit }}</v-chip>
                <v-chip v-if="item.raw.apiKey" size="x-small" color="primary" variant="outlined" class="ml-1">API</v-chip>
              </template>
            </v-list-item>
          </template>
        </v-select>
        
        <!-- 识别语言选择器 -->
        <v-select
          :model-value="recognitionLang"
          @update:model-value="$emit('update:recognitionLang', $event)"
          :items="languageOptions"
          label="识别语言"
          variant="outlined"
          density="compact"
          hide-details
          class="toolbar-select me-3"
          style="max-width: 140px;"
        />
        
        <!-- 目标语言选择器 -->
        <v-select
          :model-value="targetLang"
          @update:model-value="$emit('update:targetLang', $event)"
          :items="targetLanguageOptions"
          label="目标语言"
          variant="outlined"
          density="compact"
          :disabled="!enableTranslation"
          hide-details
          class="toolbar-select me-3"
          style="max-width: 140px;"
        />
        
        <v-spacer />
        
        <!-- 导航按钮 -->
        <v-btn
          icon
          size="small"
          :color="currentPage === 'home' ? 'secondary' : 'white'"
          @click="$emit('update:currentPage', 'home')"
        >
          <v-icon>mdi-home</v-icon>
        </v-btn>
        <v-btn
          icon
          size="small"
          :color="currentPage === 'settings' ? 'secondary' : 'white'"
          @click="$emit('update:currentPage', 'settings')"
        >
          <v-icon>mdi-cog</v-icon>
        </v-btn>
        <v-btn
          icon
          size="small"
          :color="currentPage === 'translation' ? 'secondary' : 'white'"
          @click="$emit('update:currentPage', 'translation')"
        >
          <v-icon>mdi-translate-variant</v-icon>
        </v-btn>
      </div>
    </v-container>
  </v-app-bar>
</template>

<script setup>
defineProps({
  enableTranslation: Boolean,
  translationService: String,
  translationServiceItems: Array,
  recognitionLang: String,
  targetLang: String,
  languageOptions: Array,
  targetLanguageOptions: Array,
  currentPage: String
})

defineEmits([
  'update:enableTranslation',
  'update:translationService',
  'update:recognitionLang',
  'update:targetLang',
  'update:currentPage'
])
</script>

<style scoped>
/* 工具栏选择器样式已移至全局样式 global.css */
</style>