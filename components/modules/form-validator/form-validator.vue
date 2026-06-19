<template>
  <div class="form-validator">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'FormValidator',
  props: {
    rules: {
      type: Object,
      default: () => ({})
    },
    initialValues: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      formData: { ...this.initialValues },
      errors: {}
    }
  },
  methods: {
    // 验证单个字段
    validateField(field) {
      const rules = this.rules[field];
      if (!rules) return true;

      const value = this.formData[field];
      let error = '';

      for (const rule of rules) {
        if (rule.required && !value) {
          error = rule.message || '此字段为必填项';
          break;
        }

        if (rule.min && value.length < rule.min) {
          error = rule.message || `最少需要${rule.min}个字符`;
          break;
        }

        if (rule.max && value.length > rule.max) {
          error = rule.message || `最多允许${rule.max}个字符`;
          break;
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          error = rule.message || '格式不正确';
          break;
        }

        if (rule.validator) {
          const validatorError = rule.validator(value, this.formData);
          if (validatorError) {
            error = validatorError;
            break;
          }
        }
      }

      this.errors[field] = error;
      return !error;
    },

    // 验证整个表单
    validate() {
      let isValid = true;
      this.errors = {};

      for (const field in this.rules) {
        if (!this.validateField(field)) {
          isValid = false;
        }
      }

      this.$emit('validate', isValid, this.formData, this.errors);
      return isValid;
    },

    // 重置表单
    reset() {
      this.formData = { ...this.initialValues };
      this.errors = {};
      this.$emit('reset', this.formData);
    },

    // 设置表单值
    setValue(field, value) {
      this.formData[field] = value;
      this.validateField(field);
    },

    // 获取表单值
    getValue(field) {
      return this.formData[field];
    },

    // 获取所有表单值
    getAllValues() {
      return { ...this.formData };
    }
  },
  watch: {
    initialValues: {
      handler(newValues) {
        this.formData = { ...newValues };
      },
      deep: true
    }
  }
};
</script>

<style scoped>
.form-validator {
  width: 100%;
}
</style>