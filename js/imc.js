var sharedMixin = {
  computed: {
    performed() {
      return !!this.data && Object.keys(this.data).length > 0;
    },
    profileData() {
      return this.data?.user_profile || {}; // 🔹 Ensure `user_profile` always exists
    },
    profilePicture() {
      return this.profileData?.picture || null;
    },
    profileName() {
      return this.profileData?.fullname || "N/A";
    },
    profileBio() {
      return this.profileData?.description || "No bio available.";
    },
    profileFollowers() {
      return this.profileData?.followers || 0;
    },
    profileEngagementRate() {
      return this.profileData?.engagement_rate
        ? this.profileData.engagement_rate * 100
        : 0;
    },
    profileLikes() {
      return this.profileData?.avg_likes || 0;
    },
    profileComments() {
      return this.profileData?.avg_comments || 0;
    },
    profileViews() {
      return this.profileData?.avg_views || 0;
    },
    profilePosts() {
      return this.profileData?.posts_count || 0;
    },
    chartLabels() {
      return this.profileData?.stat_history?.map((stat) => stat.month) || [];
    },
    chartFollowersData() {
      return (
        this.profileData?.stat_history?.map((stat) => stat.followers) || []
      );
    },
    chartFollowingData() {
      return (
        this.profileData?.stat_history?.map((stat) => stat.following) || []
      );
    },
    chartLikesData() {
      return (
        this.profileData?.stat_history?.map((stat) => stat.avg_likes) || []
      );
    },
  },

  methods: {
    setSubmitted(flag) {
      this.submitted = flag;

      // Check screen size and scroll if width is less than 768px
      if (window.innerWidth < 768) {
        const element = document.querySelector(".display-wrapper");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
    onDataLoad() {},
    resetInput(number = null) {
      if (number) {
        console.log(`Resetting input for input ${number}`);
        this[`url${number}`] = null; // Reset specific input field
        this[`data${number}`] = null; // Reset fetched data
        this[`loading${number}`] = false; // Reset loading state
        this[`error${number}`] = null; // Reset error state
      } else {
        console.log(`Resetting input for single user mode`);
        this.url = null;
        this.data = null;
        this.loading = false;
        this.error = false;
      }
    },

    buildChart(title, ref, labels, data) {
      new Chart(this.$refs[ref], {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: title,
              data: data,
              borderWidth: 1,
              backgroundColor: ["rgba(105, 110, 255, 0.1)"],
              borderColor: ["rgba(105, 110, 255, 1)"],
            },
          ],
        },
        options: {
          responsive: false,
          legend: { display: false },
          scales: {
            yAxes: [
              {
                gridLines: { display: false },
                ticks: {
                  callback: function (value) {
                    return Vue.filter("nn")(value);
                  },
                },
              },
            ],
            xAxes: [
              {
                gridLines: { display: false },
                ticks: {
                  callback: function (value) {
                    var d = new Date(value + "-01");
                    return d.toLocaleString("default", { month: "short" });
                  },
                },
              },
            ],
          },
        },
      });
    },
  },
};

var imcMixin = {
  mixins: [sharedMixin], // Use shared mixin

  data() {
    return {
      url: null, // Will hold the username entered by the user
      data: {},
      error: false,
      loading: false,
      submitted: false,
      handler: null,
      reportId: null, // Store report ID for PDF download
    };
  },

  computed: {
    lookalikesShort() {
      if (!this.data) {
        return [];
      }

      if (this.data?.audience_followers?.data?.audience_lookalikes) {
        return this.data.audience_followers.data.audience_lookalikes.slice(
          0,
          3
        );
      }

      if (this.data?.user_profile?.similar_users) {
        return this.data.user_profile.similar_users.slice(0, 3);
      }

      return [];
    },
    lookalikesAll() {
      if (!this.data) {
        return [];
      }

      if (this.data?.audience_followers?.data?.audience_lookalikes) {
        return this.data.audience_followers.data.audience_lookalikes;
      }

      if (this.data?.user_profile?.similar_users) {
        return this.data.user_profile.similar_users;
      }

      return [];
    },
  },

  methods: {
    start() {
      this.loading = true;
      this.getData();
    },

    getData() {
      var self = this;
      var toolId =
        document.getElementById("grin-imc").getAttribute("data-tool-id") ||
        "default_tool";
      const uri =
        "https://grin.co/wp-admin/admin-ajax.php?action=fetch_profile_data&url=" +
        self.url +
        "&tool_id=" +
        encodeURIComponent(toolId);

      fetch(uri, {
        method: "GET",
      })
        .then(function (response) {
          if (response.status === 429 || response.status === 502) {
            openCustomPopup("#custom-popup-2");
            self.resetInput();
          }
          return response.text(); // Get response as text first
        })
        .then(function (text) {
          try {
            return JSON.parse(text); // Try parsing JSON
          } catch (e) {
            console.error("JSON Parsing Error:", e);
            openCustomPopup("#custom-popup-2");
            self.resetInput();
            throw new Error("Invalid JSON Response"); // This ensures .catch() still runs
          }
        })
        .then(function (result) {
          if (!result || typeof result !== "object" || !("success" in result)) {
            console.error("Unexpected API response:", result);
            openCustomPopup("#custom-popup-2");
            self.resetInput();
            throw new Error("Invalid API response");
          }

          if (!result.success) {
            if (result.data && result.data.error === "usage_limit_reached") {
              openCustomPopup("#custom-popup-3");
            } else {
              openCustomPopup("#custom-popup-2");
            }
            console.error(result.data ? result.data.message : "Unknown error");
            self.resetInput();
            throw new Error("API returned an error");
          }

          // Handle specific API errors that should trigger popup #custom-popup-4
          if (
            result.data &&
            result.data.success === false &&
            (result.data.error === "empty_audience_data" ||
              result.data.error === "retry_later" ||
              result.data.error === "account_not_found")
          ) {
            openCustomPopup("#custom-popup-4"); // Show empty audience/retry popup
            self.resetInput();
            console.error(result.data.message);
            return;
          } else if (
            result.data &&
            result.data.success === false &&
            result.data.error === "invalid_api_key"
          ) {
            openCustomPopup("#custom-popup-2"); // Show empty audience/retry popup
            self.resetInput();
            return;
          }

          self.data = result.data;
          if (result.data?.report_info?.report_id) {
            self.reportId = result.data.report_info.report_id;
          }
          self.loading = false;
          self.onDataLoad();
          trackSuccessfulToolUse(toolId);
        })

        .catch(function (error) {
          console.log("Caught an error:", error);
          self.error = true;
          self.resetInput();
        })
        .finally(function () {
          //jQuery(".imc-button[type='submit']").prop("disabled", true);
          document.getElementById("imc-form").style.display = "block";
        });
    },
  },
};

var imcMixinCompare = {
  mixins: [sharedMixin], // Use shared mixin

  data() {
    return {
      url1: null,
      url2: null,
      data1: {},
      data2: {},
      error1: null,
      error2: null,
      loading1: false,
      loading2: false,
      submitted: false,
    };
  },

  methods: {
    getCompareData(number) {
      var self = this;
      var toolId =
        document.getElementById("grin-imc").getAttribute("data-tool-id") ||
        "influencer-comparison-tool";

      const urlParam = number === 1 ? self.url1 : self.url2;
      if (!urlParam) {
        console.error(`No URL provided for input ${number}`);
        return;
      }

      const uri =
        "https://grin.co/wp-admin/admin-ajax.php?action=fetch_profile_data&url=" +
        encodeURIComponent(urlParam) +
        "&tool_id=" +
        encodeURIComponent(toolId);

      self[`loading${number}`] = true;

      fetch(uri, {
        method: "GET",
      })
        .then((response) => {
          if (response.status === 429 || response.status === 502) {
            openCustomPopup("#custom-popup-2");
            self.resetInput();
          }
          return response.text(); // Get response as text first
        })
        .then((text) => {
          try {
            return JSON.parse(text); // Try parsing JSON
          } catch (e) {
            console.error("JSON Parsing Error:", e);
            openCustomPopup("#custom-popup-2");
            self.resetInput(number);
            throw new Error("Invalid JSON Response");
          }
        })
        .then((result) => {
          if (!result || typeof result !== "object" || !("success" in result)) {
            console.error("Unexpected API response:", result);
            openCustomPopup("#custom-popup-2");
            self.resetInput(number);
            throw new Error("Invalid API response");
          }

          if (!result.success) {
            if (result.data && result.data.error === "usage_limit_reached") {
              openCustomPopup("#custom-popup-3");
            } else {
              openCustomPopup("#custom-popup-2");
            }
            console.error(result.data ? result.data.message : "Unknown error");
            self.resetInput(number);
            throw new Error("API returned an error");
          }

          // Handle specific API errors that should trigger popup #custom-popup-4
          if (
            result.data &&
            result.data.success === false &&
            (result.data.error === "empty_audience_data" ||
              result.data.error === "retry_later" ||
              result.data.error === "account_not_found")
          ) {
            openCustomPopup("#custom-popup-4"); // Show empty audience/retry popup
            console.error(result.data.message);
            self.resetInput(number);
            return;
          } else if (
            result.data &&
            result.data.success === false &&
            result.data.error === "invalid_api_key"
          ) {
            openCustomPopup("#custom-popup-2"); // Show empty audience/retry popup
            self.resetInput(number);
            return;
          }

          // Store the result in the corresponding data field
          self["data" + number] = result.data;
          self["loading" + number] = false;

          trackSuccessfulToolUse(toolId);
        })
        .catch((error) => {
          console.log("Caught an error:", error);
          self["error" + number] = true;
          self.resetInput(number);
        })
        .finally(() => {
          document.getElementById("imc-form").style.display = "block";
        });
    },
  },
};

Vue.filter("nn", function (value) {
  if (value < 10) {
    return value.toFixed(2);
  }

  value = Math.round(Number(value) || 0);

  if (value >= 1000000000) {
    return `${parseFloat((value / 1000000000).toFixed(1))}B`;
  }
  if (value >= 1000000) {
    return `${parseFloat((value / 1000000).toFixed(1))}M`;
  }
  if (value >= 1000) {
    return `${parseFloat((value / 1000).toFixed(1))}K`;
  }

  return value;
});

Vue.component("imc-loader", {
  template:
    '<div class="imc-loader-wrapper"><img src="https://grin.co/wp-content/uploads/imc/spin2.gif" /></div>',
});

Vue.component("imc-user-list", {
  props: ["users"],
  template:
    '<div class="imc-user-list">' +
    '  <div v-for="user in users" class="imc-list-user">' +
    '    <span class="imc-user-list-profile">' +
    '      <a :href="user.url" target="_blank">' +
    '        <img :src="user.picture" class="imc-profile-picture medium" />' +
    '        <span class="imc-user-list-name">{{ user.fullname }}</span>' +
    "      </a>" +
    "    </span>" +
    '    <span class="imc-list-stat">' +
    '      <span class="imc-list-stat-num">{{ user.followers | nn }}</span>' +
    '      <span class="imc-list-stat-label">Followers</span>' +
    "    </span>" +
    '    <span class="imc-list-stat">' +
    '      <span class="imc-list-stat-num">{{ user.engagements | nn }}</span>' +
    '      <span class="imc-list-stat-label">Engagements</span>' +
    "    </span>" +
    "  </div>" +
    "</div>",
});

Vue.component("imc-profile", {
  props: ["name", "bio", "picture", "size"],
  computed: {
    imageClass() {
      return {
        default: !this.size,
        [this.size]: !!this.size,
      };
    },
  },
  template:
    '<div class="imc-profile" :class="imageClass">' +
    '  <div class="imc-profile-picture-wrapper">' +
    '    <img :src="picture" class="imc-profile-picture" :class="imageClass" />' +
    "  </div>" +
    '  <div class="imc-profile-info">' +
    '    <div class="imc-profile-name">{{ name }}</div>' +
    '    <div class="imc-profile-bio">{{ bio }}</div>' +
    "  </div>" +
    "</div>",
});

Vue.component("imc-stat", {
  props: ["stat", "label", "percent"],
  template:
    '<div class="imc-stat">' +
    '  <span class="imc-stat-value">{{ stat | nn }}{{ percent ? "%" : ""}}</span>' +
    '  <span class="imc-stat-label">{{ label }}</span>' +
    "</div>",
});

Vue.component("imc-input", {
  props: ["value", "label", "loading", "placeholder"],
  methods: {
    handleInput(event) {
      this.$emit("input", event.target.value);
    },
    handleSubmit() {
      this.$emit("submit");
    },
  },
  template:
    '<div class="imc-field">' +
    '  <input type="search" name="search" :disabled="loading" :placeholder="placeholder" class="imc-query" :value="value" @input="handleInput" />' +
    '  <button type="submit" class="imc-button" :disabled="loading" @click="handleSubmit">Check</button>' +
    "</div>",
});

Vue.component("imc-already", {
  template: "<div>Already performed action...placeholder</div>",
});

Vue.component("imc-compare-stat", {
  props: ["label", "stat", "percent"],
  template:
    '<div class="imc-compare-stat">' +
    '  <span class="imc-compare-stat-label">{{ label }}:</span>' +
    '  <span class="imc-compare-stat-num">{{ stat | nn }}{{ percent ? "%" : ""}}</span>' +
    "</div>",
});

function trackSuccessfulToolUse(locationID) {
  jQuery.ajax({
    url: imc_ajax_object.ajax_url,
    type: "POST",
    data: {
      action: "custom_site_tracking_store_entry",
      location_id: locationID,
    },
    success: function (response) {
      console.log("data saved successfully.");
    },
    error: function (error) {
      console.log("Error saving data:", error);
    },
  });
}
