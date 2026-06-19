<template>
  <div class="modal-overlay" v-if="visible" @click.self="handleOverlayClick">
    <div class="modal-container" :class="{ 'modal-large': size === 'large', 'modal-small': size === 'small' }">
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button class="modal-close" @click="handleClose">
          ×
        </button>
      </div>
      <div class="modal-body">
        <slot></slot>
      </div>
      <div class="modal-footer" v-if="showFooter">
        <button class="modal-btn modal-btn-cancel" @click="handleCancel">
          {{ cancelText }}
        </button>
        <button class="modal-btn modal-btn-confirm" :class="{ 'modal-btn-danger': type === 'danger' }" @click="handleConfirm">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Modal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '提示'
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    type: {
      type: String,
      default: 'default',
      validator: (value) => ['default', 'danger', 'success', 'warning'].includes(value)
    },
    showFooter: {
      type: Boolean,
      default: true
    },
    cancelText: {
      type: String,
      default: '取消'
    },
    confirmText: {
      type: String,
      default: '确定'
    },
    closeOnOverlayClick: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    handleClose() {
      this.$emit('close');
    },
    handleCancel() {
      this.$emit('cancel');
    },
    handleConfirm() {
      this.$emit('confirm');
    },
    handleOverlayClick() {
      if (this.closeOnOverlayClick) {
        this.$emit('close');
      }
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  animation: modalFadeIn 0.3s ease;
}

.modal-small {
  max-width: 300px;
}

.modal-large {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.3s;
}

.modal-close:hover {
  background-color: #f0f0f0;
  color: #333;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  border: 1px solid #d9d9d9;
}

.modal-btn-cancel {
  background-color: #fff;
  color: #333;
}

.modal-btn-cancel:hover {
  border-color: #40a9ff;
  color: #40a9ff;
}

.modal-btn-confirm {
  background-color: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.modal-btn-confirm:hover {
  background-color: #40a9ff;
  border-color: #40a9ff;
}

.modal-btn-danger {
  background-color: #ff4d4f;
  border-color: #ff4d4f;
}

.modal-btn-danger:hover {
  background-color: #ff7875;
  border-color: #ff7875;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>